const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {userJoin, getCurrentUser, userLeave , getRoomUsers} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(path.join(__dirname,'public/js')));

const botName = 'Bot ;D';
Aliens = [];
Bombs = [];

io.on('connection', socket => {
    socket.on('joinRoom', ({username,room}) => {
        console.log("User: " + username);
        if(getRoomUsers(room).length >= 2) {
            socket.emit('roomFull',formatMessage(botName,'Esta sala esta llena! Prueba con otro ID...'));
        }
        else {
            if(getRoomUsers(room).length == 1) {
                socket.emit('message', formatMessage(botName,'BIENVENIDO!'));
            }
            else {
                socket.emit('message', formatMessage(botName,'BIENVENIDO! Esperando a otros jugadores...'));
            }
            const user = userJoin(socket.id, username, room);
            
            socket.join(user.room);
        
            socket.broadcast.to(user.room).emit('message', formatMessage(botName,`${user.username} se unió`));
            
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
    
    socket.on('start', (message) => {
        const user = getCurrentUser(socket.id);
        
        if(user != undefined && getRoomUsers(user.room).length > 1){
            socket.emit('playerOne')
        }
    });
    
    socket.on('createAliens', (aliens) => {
        const user = getCurrentUser(socket.id);
        Aliens = aliens;
        io.to(user.room).emit('begin', aliens);
    });

    socket.on('update', (data) => {
        const user = getCurrentUser(socket.id);
        Aliens = data.Aliens;
        Bombs = data.Bombs;
        if(user != undefined)
            socket.broadcast.to(user.room).emit('updated',data);
    });

    socket.on('chatMessage', (message) => {
        const user = getCurrentUser(socket.id);
        if(user != undefined)
            io.to(user.room).emit('message',formatMessage(user.username,message));
    });

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if(user != undefined){
            io.to(user.room).emit('message', formatMessage(botName,`${user.username} se fué :/`));
            io.to(user.room).emit('dc');
            console.log('Jugador desconectado: ' + user.username);
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Servidor en puerto: ${PORT}`))