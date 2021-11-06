import { ito } from './ito/_ito';

const socketIo = require('socket.io-client');

interface room {
  id: string;
  gameName: string;
  user: user[];
  chat: chat[];
}

interface user {
  id: number;
  name: string;
  color: string;
}

interface chat {
  name: string;
  text: string;
}

export let socket,
  isOwner = false,
  targetRoom: room,
  currentRoomIndex: number,
  myInfo: user;

document.addEventListener('DOMContentLoaded', () => {
  socket = socketIo();
  serverResponse();
  login();
});

window.onbeforeunload = () => {
  if (myInfo && myInfo.name) {
    socket.emit('exitUser', [currentRoomIndex, myInfo]);
  }
};

const serverResponse = () => {
  socket.on('updateUser', data => {
    const room = data[0],
      roomIndex = data[1],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    const joinUser = <HTMLElement>document.querySelector('#joinUser');
    if (!joinUser) return;

    console.log('aaa', room.user);

    joinUser.innerHTML = '';
    for (let i = 0; i < room.user.length; i++) {
      const user = room.user[i],
        newUser = `<li userid=${user.id} color=${user.color}>${user.name}</li>`;
      joinUser.innerHTML += newUser;
    }

    joinUser.style.height = '';
    if (joinUser.clientHeight > 60) {
      joinUser.style.height = `${joinUser.clientHeight + 20}px`;
    }
  });

  socket.on('insertChat', data => {
    const room = data[0],
      roomIndex = data[1],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    const chatBlock = <HTMLElement>document.querySelector('.p-chat__block');
    chatBlock.innerHTML = '';
    for (let i = 0; i < room.chat.length; i++) {
      const target = room.chat[i],
        chat = `<div class="p-chat__item" color=${target.color}>
                  <span class="p-chat__name">${target.name}</span>
                  <p class="p-chat__text">${target.text}</p>
                </div>`;

      chatBlock.innerHTML += chat;
    }

    const bottom = chatBlock.scrollHeight - chatBlock.clientHeight;
    chatBlock.scroll(0, bottom);
  });
};

export const checkTargetRoom = (
  targetIndex: number,
  roomIndex: number
): boolean => {
  if (targetIndex === roomIndex) return true;
};

const login = () => {
  const login = <HTMLElement>document.querySelector('.p-login'),
    loginBlock = <HTMLElement>login.querySelector('.p-login__block'),
    loginInput = <HTMLInputElement>loginBlock.querySelector('[type=text]'),
    loginBtn = <HTMLElement>loginBlock.querySelector('.c-btn');

  loginBtn.addEventListener('click', () => {
    if (loginInput.value === '8160') {
      const admin = <HTMLElement>document.querySelector('.p-admin'),
        adminBlock = <HTMLElement>admin.querySelector('.p-admin__block'),
        adminForm = <HTMLElement>admin.querySelector('.p-admin__form'),
        configBtn = <HTMLElement>admin.querySelector('#configRoom'),
        deleteBtn = <HTMLElement>admin.querySelector('#deleteRoom'),
        createBtn = <HTMLElement>admin.querySelector('#createRoom');

      login.classList.remove('is-active');
      admin.classList.add('is-active');

      configBtn.addEventListener('click', () => {
        adminBlock.classList.remove('is-active');
        adminForm.classList.add('is-active');
      });

      deleteBtn.addEventListener('click', () => {
        socket.emit('deleteRoom');
        alert('ルームを削除しました。');
      });

      createBtn.addEventListener('click', () => {
        socket.emit('getRoomIndex', index => (currentRoomIndex = index));

        const items = <NodeListOf<HTMLElement>>(
            admin.querySelectorAll('.c-form__detail')
          ),
          roomIdInput = <HTMLInputElement>items[0].querySelector('[type=text]'),
          gameSelect = <HTMLSelectElement>items[1].querySelector('select'),
          newRoom: room = {
            id: roomIdInput.value,
            gameName: gameSelect.options[gameSelect.selectedIndex].textContent,
            user: [],
            chat: [],
          };
        socket.emit('createRoom', newRoom);
        isOwner = true;
        setName();
      });
    } else {
      socket.emit('checkRoom', loginInput.value, (isLogin, index?) => {
        if (isLogin) {
          currentRoomIndex = index;
          isOwner = false;
          setName();
        } else {
          const error = <HTMLElement>(
            loginBlock.querySelector('.p-login__error')
          );
          error.classList.add('is-active');
        }
      });
    }
  });
};

const setName = () => {
  const login = <HTMLElement>document.querySelector('.p-login'),
    loginBlock = <HTMLElement>login.querySelector('.p-login__block'),
    loginForm = <HTMLElement>login.querySelector('.p-login__form'),
    admin = <HTMLElement>document.querySelector('.p-admin'),
    input = <HTMLInputElement>loginForm.querySelector('[type=text]'),
    enterBtn = <HTMLElement>loginForm.querySelector('.c-btn');

  login.classList.add('is-active');
  loginForm.classList.add('is-active');
  loginBlock.classList.remove('is-active');
  admin.classList.remove('is-active');

  const colorSelect = <HTMLElement>loginForm.querySelector('.c-colorSelect'),
    selected = <HTMLElement>(
      colorSelect.querySelector('.c-colorSelect__selected')
    ),
    colorList = <HTMLElement>colorSelect.querySelector('.c-colorSelect__list'),
    colorItem = <NodeListOf<HTMLElement>>(
      colorList.querySelectorAll('.c-colorSelect__item')
    );

  selected.addEventListener('click', () => {
    colorList.classList.add('is-active');
  });

  for (let i = 0; i < colorItem.length; i++) {
    const item = colorItem[i];
    item.addEventListener('click', () => {
      selected.setAttribute('color', item.getAttribute('color'));
      colorList.classList.remove('is-active');
    });
  }

  enterBtn.addEventListener('click', () => {
    if (!input.value) return;

    socket.emit('getUserLength', currentRoomIndex, (id: number) => {
      const newUser: user = {
        id: id + 1,
        name: input.value,
        color: selected.getAttribute('color'),
      };

      myInfo = newUser;
      openRoom();
      socket.emit('getRoom', currentRoomIndex, (room: room) => {
        targetRoom = room;
        initGame(targetRoom.gameName);
        socket.emit('addUser', [currentRoomIndex, myInfo]);
      });
    });
  });
};

const openRoom = (): void => {
  const main = <HTMLElement>document.querySelector('.l-main'),
    login = <HTMLElement>document.querySelector('.p-login'),
    admin = <HTMLElement>document.querySelector('.p-admin');

  main.classList.add('is-active');
  login.classList.remove('is-active');
  admin.classList.remove('is-active');

  initUserMenu();
  initChat();
  changeChatSize();
  movingChat();
};

const initGame = (gameName: string) => {
  if (gameName === 'ito') {
    ito();
  }
  // other game
};

const initUserMenu = () => {
  const menu = <HTMLElement>document.querySelector('.p-userMenu'),
    icon = <HTMLElement>menu.querySelector('.p-userMenu__icon'),
    block = <HTMLElement>menu.querySelector('.p-userMenu__block'),
    nameBtn = <HTMLElement>menu.querySelector('#changeName'),
    colorBtn = <HTMLElement>menu.querySelector('#changeColor'),
    logoutBtn = <HTMLElement>menu.querySelector('#logout'),
    nameModal = <HTMLElement>menu.querySelector('.p-userMenu__modal--name'),
    colorModal = <HTMLElement>menu.querySelector('.p-userMenu__modal--color');

  icon.addEventListener('click', () => {
    block.classList.add('is-active');
  });

  document.addEventListener('click', e => {
    const target = <HTMLElement>e.target;
    if (!target.closest('.p-userMenu')) {
      block.classList.remove('is-active');
      nameModal.classList.remove('is-active');
      colorModal.classList.remove('is-active');
    }
  });

  const nameModalInput = <HTMLInputElement>(
      nameModal.querySelector('[type=text]')
    ),
    nameModalBtn = <HTMLInputElement>nameModal.querySelector('.c-btn');

  nameModalInput.value = myInfo.name;
  nameBtn.addEventListener('click', () => {
    nameModal.classList.add('is-active');
    colorModal.classList.remove('is-active');
  });

  nameModalBtn.addEventListener('click', () => {
    myInfo.name = nameModalInput.value;
    socket.emit('changeName', [currentRoomIndex, myInfo]);
    nameModal.classList.remove('is-active');
  });

  colorBtn.addEventListener('click', () => {
    colorModal.classList.add('is-active');
    nameModal.classList.remove('is-active');
  });

  const selected = <HTMLElement>(
      colorModal.querySelector('.c-colorSelect__selected')
    ),
    colorList = <HTMLElement>colorModal.querySelector('.c-colorSelect__list'),
    colorItem = <NodeListOf<HTMLElement>>(
      colorModal.querySelectorAll('.c-colorSelect__item')
    ),
    colorModalBtn = <HTMLInputElement>colorModal.querySelector('.c-btn');

  selected.setAttribute('color', myInfo.color);
  colorModalBtn.addEventListener('click', () => {
    myInfo.color = selected.getAttribute('color');
    socket.emit('changeColor', [currentRoomIndex, myInfo]);
    colorModal.classList.remove('is-active');
  });

  selected.addEventListener('click', () => {
    colorList.classList.add('is-active');
  });

  for (let i = 0; i < colorItem.length; i++) {
    const item = colorItem[i];
    item.addEventListener('click', () => {
      selected.setAttribute('color', item.getAttribute('color'));
      colorList.classList.remove('is-active');
    });
  }

  logoutBtn.addEventListener('click', () => {
    socket.emit('exitUser', [currentRoomIndex, myInfo]);
    location.reload();
  });
};

const initChat = () => {
  const chatForm = <HTMLElement>document.querySelector('.p-chat__form'),
    chatInput = <HTMLInputElement>chatForm.querySelector('[type=text]'),
    chatSubmit = <HTMLInputElement>chatForm.querySelector('.c-btn');

  chatSubmit.addEventListener('click', () => {
    if (chatInput.value) {
      socket.emit('chatSubmit', [currentRoomIndex, myInfo, chatInput.value]);
      chatInput.value = '';
    }
  });
};

const changeChatSize = () => {
  const lobby = <HTMLElement>document.querySelector('.p-lobby'),
    chat = <HTMLElement>lobby.querySelector('.p-chat'),
    widthMenu = <NodeListOf<HTMLElement>>(
      lobby.querySelectorAll('.p-chat__menu--width li')
    ),
    heightMenu = <NodeListOf<HTMLElement>>(
      lobby.querySelectorAll('.p-chat__menu--height li')
    );

  for (let i = 0; i < widthMenu.length; i++) {
    const menu = widthMenu[i];
    menu.addEventListener('click', () => {
      chat.setAttribute('size', menu.className);
    });
  }

  for (let i = 0; i < heightMenu.length; i++) {
    const menu = heightMenu[i];
    menu.addEventListener('click', () => {
      lobby.setAttribute('size', menu.className);
    });
  }
};

const movingChat = () => {
  if (!window.matchMedia('(min-width: 768px)').matches) return;

  const lobby = <HTMLElement>document.querySelector('.p-lobby'),
    chat = <HTMLElement>lobby.querySelector('.p-chat');

  let isDrag = false,
    x_offset = 0,
    y_offset = 0;

  chat.addEventListener('mousedown', e => {
    isDrag = true;
    x_offset = e.pageX - chat.getBoundingClientRect().left;
    y_offset = e.pageY - chat.getBoundingClientRect().top;
  });

  chat.addEventListener('mousemove', e => {
    if (!isDrag) return;

    e.preventDefault();
    const moveX = e.pageX - x_offset,
      moveY = e.pageY - y_offset;

    chat.style.left = `${moveX}px`;
    chat.style.top = `${moveY}px`;
  });

  chat.addEventListener('mouseup', () => (isDrag = false));
};
