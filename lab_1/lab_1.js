/*
    Tratamento de botões e sliders

    Baseado em:
    https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/Input 
    https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button
    https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range
*/

// espere a janela carregar para chamar a main.
// onload é um evento do sistema.
window.onload = main;

// ==================================================================
// Variáveis globais
var ctx;
var width, height;  // área do canvas

// sugestão: organize os elementos da sua interface 
// Para saber mais sobre objetos em JS:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#defining_methods
var interface = {
    // atributos
    mouseX: 175,
    mouseY: 175,
    new_mouseX: 225,
    new_mouseY: 225,
    buttonDown: false,
    // métodos
    clear: function () {
      this.mouseX = 0;
      this.mouseY = 0;
      this.new_mouseX = 0;
      this.new_mouseY = 0;
      this.buttonDown = false;
    },
    setXY: function (x, y) {
      this.mouseX = x;
      this.mouseY = y;
    },
    setNewXY: function (new_x, new_y) {
        this.new_mouseX = new_x;
        this.new_mouseY = new_y;
    }
};

//==================================================================
/**
 * função principal 
 */
function main() {
  const canvas = document.getElementById('meucanvas');
  ctx = canvas.getContext('2d');
  if (!ctx) alert("Não consegui abrir o contexto 2d :-( ");

  width = canvas.width;
  height = canvas.height;

  console.log('w = ' + width + ' h = ' + height);

  construaInterface();
  desenheFillRect(175, 175, 50, 50);

  canvas.addEventListener('mousedown', function(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    interface.setXY(e.offsetX, e.offsetY);
    interface.buttonDown = true;
  });

  canvas.addEventListener('mousemove', function(e) {
    if (interface.buttonDown == true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setLineDash([6]);
        ctx.strokeRect(interface.mouseX, interface.mouseY, e.offsetX - interface.mouseX , e.offsetY - interface.mouseY)
    }
  });

  canvas.addEventListener('mouseup', function(e) {
    if (interface.buttonDown == true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        interface.setNewXY(e.offsetX, e.offsetY);
        ctx.fillRect(interface.mouseX, interface.mouseY, e.offsetX - interface.mouseX , e.offsetY - interface.mouseY)
        interface.buttonDown = false;
    }
  });
}

//==================================================================
// Interface e callbacks

/**
 * Registra os elementos HTML responsáveis pela interação no objeto
 * interface e os associa às rotinas de callback.
 */
function construaInterface() {
  // monta estrutura com os elementos da interface
  interface.barraR = document.getElementById('Barra R');
  interface.barraG = document.getElementById('Barra G');
  interface.barraB = document.getElementById('Barra B');

  // registro das funções de callback
  // associa um evento de um elemento a uma função
  interface.barraR.onchange = callbackBarraMudeCor;
  interface.barraG.onchange = callbackBarraMudeCor;
  interface.barraB.onchange = callbackBarraMudeCor;

  // chama a função de callback para criar o desenho inicial
  callbackBarraMudeCor();
}

// ------------------------------------------------------------------
// funções de CallBack
/**
 * Trata os eventos das 3 barras para mudança de cor.
 * Observe que a mesma função de callback é utilizada
 * para as 3 barras.
 * @param {*} e 
 */
function callbackBarraMudeCor(e) {
  let r = interface.barraR.value;
  let g = interface.barraG.value;
  let b = interface.barraB.value;

  let novacor = `rgb(${r}, ${g}, ${b})`;
  console.log("cor = ", novacor);

  ctx.fillStyle = novacor;
  ctx.fillRect(interface.mouseX, interface.mouseY, interface.new_mouseX - interface.mouseX , interface.new_mouseY - interface.mouseY)
}

// ------------------------------------------------------------------
// funções de desenho
/**
 * desenha um retangulo prenchido com o cor 
 * atual no canto (x,y) com dimensao (w,h)
 * @param {number} x 
 * @param {number} y 
 * @param {number} w 
 * @param {number} h 
 */
function desenheFillRect(x, y, w, h) {
  let quad = new Path2D();
  quad.moveTo(x, y);
  quad.lineTo(x + w, y);
  quad.lineTo(x + w, y + h);
  quad.lineTo(x, y + h);
  quad.closePath();
  ctx.fill(quad);
}
