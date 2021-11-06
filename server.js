/* ===================
  Server Config
===================== */
const express = require('express'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io')(http),
  PORT = process.env.PORT || 7000;

app
  .use(express.static('public'))
  .get('/', (req, res) => res.render(__dirname + '/index.html'));

http.listen(PORT, function () {
  console.log(`Listening on ${PORT} \n access to http://localhost:${PORT}/`);
});

/* ===================
  Socket Functions
===================== */
let roomList = [];

io.on('connection', socket => {
  socket.on('createRoom', data => {
    roomList.push(data)
  });

  socket.on('deleteRoom', () => {
    roomList = []
  });

  socket.on('getRoom', (roomId, callback) => {
    callback(roomList[roomId])
  })

  socket.on('getRoomIndex', callback => {
    callback(roomList.length)
  });

  socket.on('getUserLength', (roomId, callback) => {
    if (roomList[roomId].user.length) {
      callback(roomList[roomId].user[roomList[roomId].user.length - 1].id)
    }
    else {
      callback(0)
    }
  });

  socket.on('checkRoom', (roomId, callback) => {
    let
      isLogin = false,
      targetRoomIndex;

    for (let i = 0; i < roomList.length; i ++) {
      if (roomList[i].id === roomId ) {
        isLogin = true;
        targetRoomIndex = i
        break;
      }
    }
    isLogin ? callback(true, targetRoomIndex) : callback(false);
  });

  socket.on('addUser', data => {
    const
      targetIndex = data[0],
      newUser = data[1];

    roomList[targetIndex].user.push(newUser)
    io.emit('updateUser', [roomList[targetIndex], targetIndex])
    io.emit('insertChat', [roomList[targetIndex], targetIndex])
  })

  socket.on('exitUser', data => {
    let
      targetIndex = data[0],
      userData = data[1],
      deleteData = roomList[targetIndex].user.filter(v => v.id === userData.id)[0];

    roomList[targetIndex].user.some((v, i) => {
      if (v.id === deleteData.id) roomList[targetIndex].user.splice(i, 1);
    });
    io.emit('updateUser', [roomList[targetIndex], targetIndex])
  })

  socket.on('changeName', data => {
    const
      targetIndex = data[0],
      user = data[1];

    roomList[targetIndex].user.filter(v => v.id === user.id)[0].name = user.name
    io.emit('updateUser', [roomList[targetIndex], targetIndex])
  })

  socket.on('changeColor', data => {
    const
      targetIndex = data[0],
      user = data[1];

    roomList[targetIndex].user.filter(v => v.id === user.id)[0].color = user.color
    io.emit('updateUser', [roomList[targetIndex], targetIndex])
  })

  socket.on('chatSubmit', data => {
    const
      targetIndex = data[0],
      user = data[1],
      text = data[2],
      newChat = {
        name: user.name,
        color: user.color,
        text: text
      };

    roomList[targetIndex].chat.push(newChat)
    io.emit('insertChat', [roomList[targetIndex], targetIndex])
  })

  /* ===================
    ito Functions
  ===================== */
  socket.on('ito:start', data => {
    const
      targetIndex = data[0],
      theme = data[1],
      userRandomList = [],
      randoms = [];

    for (let i = 0; i < roomList[targetIndex].user.length; i ++) {
      let notInclude = true;
      while(notInclude) {
        const random = Math.floor(Math.random() * 101);
        if (!randoms.includes(random)) {
          randoms.push(random);
          notInclude = false;
          userRandomList.push({
            user: roomList[targetIndex].user[i],
            num: random
          })
        }
      }
    }
    io.emit('ito:start', [targetIndex, theme, userRandomList])
  })

  socket.on('ito:answerSend', data => {
    io.emit('ito:answerUpdate', data)
  })

  socket.on('ito:swap', data => {
    io.emit('ito:swap', data)
  })

  socket.on('ito:check', data => {
    io.emit('ito:check', data)
  })

  socket.on('ito:backLobby', roomId => {
    io.emit('ito:backLobby', roomId)
    io.emit('updateUser', [roomList[roomId], roomId])
  })
});