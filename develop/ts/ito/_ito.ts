import { themeList } from './_themelist';
import {
  socket,
  isOwner,
  currentRoomIndex,
  myInfo,
  checkTargetRoom,
} from '../script';

let wrapper: HTMLElement, lobbyElement: string, mainElement: string;

export const ito = (): void => {
  setVariable();
  wrapper.classList.add('p-ito');
  wrapper.innerHTML = lobbyElement;
  serverResponse();
  initIto();
};

const setVariable = () => {
  const themeRadio = isOwner
      ? `<div class="p-ito__radio u-mb10">
      <div class="c-radio">
        <input id="radio1" type="radio" name="itoRadio" checked>
        <label for="radio1">リストからテーマを選ぶ</label>
      </div>
      <div class="c-radio">
        <input id="radio2" type="radio" name="itoRadio">
        <label for="radio2">ランダムでテーマを選ぶ</label>
      </div>
      <div class="c-radio">
        <input id="radio3" type="radio" name="itoRadio">
        <label for="radio3">フリーワードのテーマを作成する</label>
      </div>
    </div>`
      : '',
    themeInput = isOwner
      ? `<div class="c-input" style="display: none;"><input type="text" placeholder="テーマを入力してください"></div>`
      : '',
    startBtn = isOwner
      ? `<div class="p-ito__startBtn u-mt40 u-alignCenter"><div class="c-btn c-btn--orange">ゲームスタート</div></div>`
      : '',
    checkBtn = isOwner
      ? `<div class="p-ito__checkBtn u-mt40 u-alignCenter"><div class="c-btn c-btn--orange">チェックする</div></div>`
      : '';

  wrapper = <HTMLElement>document.querySelector('.p-lobby__content');

  lobbyElement = `<p class="p-lobby__hdg">今回のゲームは「<span class="u-bold">ito</span>」です。</p>
                <p class="p-ito__text">ゲームの参加者</p>
                <ul id="joinUser" class="p-ito__member"></ul>
                <p class="p-ito__text">テーマを決める</p>
                ${themeRadio}
                <div class="c-select"><select></select></div>
                ${themeInput}
                ${startBtn}`;

  mainElement = `<p class="p-ito__text u-mt0">今回のテーマ</p>
              <p class="p-ito__theme"></p>
              <p class="p-ito__num">あなたの数字は<span class="u-bold">00</span>です。</p>
              <div class="p-ito__answerForm">
                <div class="c-input"><input type="text"></div>
                <div class="c-btn c-btn--blue">送信</div>
              </div>
              <p class="u-mt20">数字の大きいと思う順に上から並べてください。</p>
              <ul class="p-ito__answerList"></ul>
              ${checkBtn}`;
};

const serverResponse = () => {
  socket.on('ito:start', data => {
    const roomIndex = data[0],
      theme = data[1],
      userRandomList = data[2],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    wrapper.innerHTML = mainElement;

    const userMenu = <HTMLElement>document.querySelector('.p-userMenu'),
      themeEle = <HTMLElement>wrapper.querySelector('.p-ito__theme'),
      num = <HTMLElement>wrapper.querySelector('.p-ito__num > span'),
      form = <HTMLElement>wrapper.querySelector('.p-ito__answerForm'),
      formInput = <HTMLInputElement>form.querySelector('.c-input [type=text]'),
      formSubmit = <HTMLElement>form.querySelector('.c-btn'),
      list = <HTMLElement>wrapper.querySelector('.p-ito__answerList'),
      myNum = userRandomList.filter(v => v.user.name === myInfo.name)[0].num;

    userMenu.classList.remove('is-active');
    themeEle.textContent = theme;
    num.textContent = String(myNum);

    list.innerHTML = '';
    for (let i = 0; i < userRandomList.length; i++) {
      const swap = i === 0 ? '' : `<li class="c-swap"></li>`,
        ele = `${swap}
              <li class="p-user">
                <span class="p-user__name" color=${userRandomList[i].user.color}>${userRandomList[i].user.name}</span>
                <p class="p-user__answer"></p>
                <span class="p-user__num p-user__num--close">?</span>
                <span class="p-user__check"></span>
              </li>`;
      list.innerHTML += ele;
    }

    formSubmit.addEventListener('click', () => {
      socket.emit('ito:answerSend', [
        currentRoomIndex,
        myInfo.name,
        formInput.value,
      ]);
      formInput.value = '';
    });

    const swaps = <NodeListOf<HTMLElement>>list.querySelectorAll('.c-swap');
    for (let i = 0; i < swaps.length; i++) {
      swaps[i].addEventListener('click', () => {
        socket.emit('ito:swap', [currentRoomIndex, i]);
      });
    }

    const checkBtn = <HTMLElement>(
        wrapper.querySelector('.p-ito__checkBtn .c-btn')
      ),
      getNum = (name: string): number => {
        return userRandomList.filter(v => v.user.name === name)[0].num;
      };

    if (!checkBtn) return;
    checkBtn.addEventListener('click', () => {
      const answerList = [],
        list = <NodeListOf<HTMLElement>>(
          wrapper.querySelectorAll('.p-ito__answerList .p-user')
        );

      for (let i = 0; i < list.length; i++) {
        const name = list[i].querySelector('.p-user__name');
        answerList.push({
          num: getNum(name.textContent),
          name: name.textContent,
        });
      }
      socket.emit('ito:check', [currentRoomIndex, answerList]);

      const checkBtnWrapper = <HTMLElement>(
          wrapper.querySelector('.p-ito__checkBtn')
        ),
        backBtnBlock = `<div class="p-ito__backBtn u-mt40 u-alignCenter"><div class="c-btn">ロビーに戻る</div></div>`;

      wrapper.removeChild(checkBtnWrapper);
      wrapper.innerHTML += backBtnBlock;

      const backBtn = <HTMLElement>(
        wrapper.querySelector('.p-ito__backBtn .c-btn')
      );
      backBtn.addEventListener('click', () => {
        socket.emit('ito:backLobby', currentRoomIndex);
      });
    });
  });

  socket.on('ito:answerUpdate', data => {
    const roomIndex = data[0],
      name = data[1],
      answer = data[2],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    const list = <NodeListOf<HTMLElement>>(
      wrapper.querySelectorAll('.p-ito__answerList .p-user')
    );
    for (let i = 0; i < list.length; i++) {
      const nameEle = list[i].querySelector('.p-user__name'),
        answerEle = list[i].querySelector('.p-user__answer');

      if (nameEle.textContent === name) answerEle.textContent = answer;
    }
  });

  socket.on('ito:swap', data => {
    const roomIndex = data[0],
      targetSwapIndex = data[1],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    const list = <HTMLElement>wrapper.querySelector('.p-ito__answerList'),
      item = <NodeListOf<HTMLElement>>list.querySelectorAll('.p-user'),
      swap = <NodeListOf<HTMLElement>>list.querySelectorAll('.c-swap');

    list.insertBefore(item[targetSwapIndex + 1], item[targetSwapIndex]);
    list.insertBefore(swap[targetSwapIndex], item[targetSwapIndex]);
  });

  socket.on('ito:check', data => {
    const roomIndex = data[0],
      answerList = data[1],
      isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);

    if (!isCurrent) return;

    const list = <NodeListOf<HTMLElement>>(
        wrapper.querySelectorAll('.p-ito__answerList .p-user')
      ),
      swap = <NodeListOf<HTMLElement>>(
        wrapper.querySelectorAll('.p-ito__answerList .c-swap')
      ),
      formSubmit = <HTMLElement>(
        wrapper.querySelector('.p-ito__answerForm .c-btn')
      ),
      sort = answerList.concat().sort((a, b) => b.num - a.num);

    for (let i = 0; i < list.length; i++) {
      const num = list[i].querySelector('.p-user__num');
      num.textContent = answerList[i].num;
      num.classList.remove('p-user__num--close');
    }

    for (let i = 0; i < sort.length; i++) {
      const name = list[i].querySelector('.p-user__name'),
        check = list[i].querySelector('.p-user__check');

      name.textContent === sort[i].name
        ? check.classList.add('p-user__check--right')
        : check.classList.add('p-user__check--wrong');
    }

    formSubmit.style.pointerEvents = 'none';
    for (let i = 0; i < swap.length; i++) {
      swap[i].style.pointerEvents = 'none';
    }
  });

  socket.on('ito:backLobby', roomIndex => {
    const isCurrent = checkTargetRoom(currentRoomIndex, roomIndex);
    if (!isCurrent) return;

    wrapper.innerHTML = lobbyElement;
    initIto();
  });
};

const initIto = () => {
  const userMenu = <HTMLElement>document.querySelector('.p-userMenu'),
    selectWrapper = <HTMLElement>wrapper.querySelector('.c-select'),
    select = <HTMLSelectElement>selectWrapper.querySelector('select');

  userMenu.classList.add('is-active');

  for (let i = 0; i < themeList.length; i++) {
    select.innerHTML += `<option>${themeList[i]}</option>`;
  }

  if (isOwner) {
    const radios = <NodeListOf<HTMLInputElement>>(
        wrapper.querySelectorAll('.p-ito__radio [type=radio]')
      ),
      input = <HTMLElement>wrapper.querySelector('.c-input');

    radios[0].addEventListener('click', () => {
      selectWrapper.style.display = 'block';
      input.style.display = 'none';
    });
    radios[1].addEventListener('click', () => {
      selectWrapper.style.display = 'none';
      input.style.display = 'none';
    });
    radios[2].addEventListener('click', () => {
      selectWrapper.style.display = 'none';
      input.style.display = 'block';
    });

    const startBtn = <HTMLElement>(
      wrapper.querySelector('.p-ito__startBtn .c-btn')
    );

    startBtn.addEventListener('click', () => {
      let selectTheme: string, checkRadio: number;
      for (let i = 0; i < radios.length; i++)
        if (radios[i].checked) checkRadio = i;

      if (checkRadio === 0) {
        selectTheme = select.options[select.selectedIndex].textContent;
      } else if (checkRadio === 1) {
        const random = Math.floor(Math.random() * themeList.length);
        selectTheme = themeList[random];
      } else if (checkRadio === 2) {
        selectTheme = (<HTMLInputElement>input.querySelector('input')).value;
      }

      socket.emit('ito:start', [currentRoomIndex, selectTheme]);
    });
  }
};
