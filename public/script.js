const firebaseConfig = {
  apiKey: "AIzaSyDxCnk3z7q2i_36dfcNihDd3KP3eHoo10g",
  authDomain: "projeto-financeiro-1a95c.firebaseapp.com",
  projectId: "projeto-financeiro-1a95c",
  storageBucket: "projeto-financeiro-1a95c.firebasestorage.app",
  messagingSenderId: "133382964530",
  appId: "1:133382964530:web:5aacc21fd6467cc217032b",
  measurementId: "G-RT8GQBHRYH"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    document.getElementById('usuario-nome').innerText = `Olá, ${user.displayName || user.email}`;
    carregarTudo();
  }
});

document.getElementById('btn-sair').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'login.html';
  });
});

// ==========================================
// CLASSES (POO conforme ensinado nos slides)
// ==========================================
class Categoria {
  constructor(id, nome) {
    this.id = id;
    this.nome = nome;
  }
}

class Transacao {
  constructor(id, descricao, valor, tipo, categoriaId, categoriaNome) {
    this.id = id;
    this.descricao = descricao;
    this.valor = parseFloat(valor);
    this.tipo = tipo;
    this.categoriaId = categoriaId;
    this.categoriaNome = categoriaNome;
  }

  // Método da classe para retornar valor com sinal
  getValorComSinal() {
    return this.tipo === 'despesa' ? -this.valor : this.valor;
  }
}

class Meta {
  constructor(id, titulo, valorAlvo, valorAtual) {
    this.id = id;
    this.titulo = titulo;
    this.valorAlvo = parseFloat(valorAlvo);
    this.valorAtual = parseFloat(valorAtual) || 0;
  }

  // Porcentagem alcançada (limitada entre 0 e 100)
  getPorcentagem() {
    if (this.valorAlvo <= 0) return 0;
    return Math.min(100, (this.valorAtual / this.valorAlvo) * 100);
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

// Listas guardadas em memória (usadas ao clicar em "Editar")
let categorias = [];
let transacoes = [];
let metas = [];
let saldoTotal = 0;

// Formata número como moeda brasileira: 1234.5 -> R$ 1.234,50
function moeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Evita que textos digitados quebrem o HTML (ex: < ou ')
function limpar(texto) {
  const div = document.createElement('div');
  div.innerText = texto;
  return div.innerHTML;
}

// Faz a requisição ao servidor enviando o token do usuário logado
async function api(url, metodo = 'GET', corpo = null) {
  const token = await auth.currentUser.getIdToken();
  const opcoes = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (corpo) {
    opcoes.body = JSON.stringify(corpo);
  }
  const res = await fetch(url, opcoes);
  return res.json();
}

// Mostra/esconde a mensagem "lista vazia"
function mostrarVazio(idMensagem, quantidade) {
  document.getElementById(idMensagem).style.display = quantidade === 0 ? 'block' : 'none';
}

// Muda o formulário entre "Salvar" (novo) e "Atualizar" (editando)
function modoEdicao(idForm, editando) {
  const form = document.getElementById(idForm);
  form.querySelector('.btn-salvar').innerText = editando ? 'Atualizar' : 'Salvar';
  form.querySelector('.btn-cancelar').hidden = !editando;
  if (editando) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Limpa o formulário e volta para o modo "Salvar"
function cancelarEdicao(idForm) {
  const form = document.getElementById(idForm);
  form.reset();
  form.querySelector('input[type=hidden]').value = '';
  modoEdicao(idForm, false);
}

// ==========================================
// MANIPULAÇÃO DO DOM E REQUISIÇÕES (FETCH)
// ==========================================

// --- CATEGORIAS ---
async function carregarCategorias() {
  const dados = await api('/api/categorias');

  const lista = document.getElementById('lista-categorias');
  const select = document.getElementById('trans-categoria');
  const categoriaSelecionada = select.value; // mantém a escolha ao recarregar
  lista.innerHTML = '';
  select.innerHTML = '<option value="">Selecione uma categoria...</option>';
  categorias = [];

  dados.forEach(item => {
    const cat = new Categoria(item.id, item.nome);
    categorias.push(cat);

    // Adiciona na lista
    const li = document.createElement('li');
    li.innerHTML = `<span>${limpar(cat.nome)}</span>
      <span>
        <button class="btn-icone" title="Editar" onclick="editarCategoria('${cat.id}')">✎</button>
        <button class="btn-icone excluir" title="Excluir" onclick="deletarCategoria('${cat.id}')">✕</button>
      </span>`;
    lista.appendChild(li);

    // Adiciona no <select> de transações
    const option = document.createElement('option');
    option.value = cat.id;
    option.innerText = cat.nome;
    select.appendChild(option);
  });

  select.value = categoriaSelecionada;
  mostrarVazio('vazio-categorias', categorias.length);
}

document.getElementById('form-categoria').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('cat-id').value;
  const nome = document.getElementById('cat-nome').value;

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/categorias/${id}` : '/api/categorias';

  await api(url, metodo, { nome });

  cancelarEdicao('form-categoria');
  carregarTudo();
});

function editarCategoria(id) {
  const cat = categorias.find(c => c.id === id);
  document.getElementById('cat-id').value = cat.id;
  document.getElementById('cat-nome').value = cat.nome;
  modoEdicao('form-categoria', true);
}

async function deletarCategoria(id) {
  await api(`/api/categorias/${id}`, 'DELETE');
  carregarTudo();
}

// --- TRANSAÇÕES (COM JOIN) ---
async function carregarTransacoes() {
  const dados = await api('/api/transacoes');

  const lista = document.getElementById('lista-transacoes');
  lista.innerHTML = '';
  transacoes = [];
  let entradas = 0;
  let saidas = 0;

  dados.forEach(item => {
    const t = new Transacao(item.id, item.descricao, item.valor, item.tipo, item.categoriaId, item.categoriaNome);
    transacoes.push(t);

    if (t.tipo === 'despesa') {
      saidas += t.valor;
    } else {
      entradas += t.valor;
    }

    const classe = t.tipo === 'despesa' ? 'valor-negativo' : 'valor-positivo';
    const sinal = t.tipo === 'despesa' ? '- ' : '+ ';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${limpar(t.descricao)}</td>
      <td><span class="badge">${limpar(t.categoriaNome)}</span></td>
      <td class="${classe}">${sinal}${moeda(t.valor)}</td>
      <td class="acoes">
        <button class="btn-icone" title="Editar" onclick="editarTransacao('${t.id}')">✎</button>
        <button class="btn-icone excluir" title="Excluir" onclick="deletarTransacao('${t.id}')">✕</button>
      </td>`;
    lista.appendChild(tr);
  });

  saldoTotal = entradas - saidas;

  // Atualiza os 3 cards do topo
  document.getElementById('total-entradas').innerText = '+ ' + moeda(entradas);
  document.getElementById('total-saidas').innerText = '- ' + moeda(saidas);
  document.getElementById('saldo-total').innerText = moeda(saldoTotal);
  document.getElementById('card-total').classList.toggle('negativo', saldoTotal < 0);
  mostrarVazio('vazio-transacoes', transacoes.length);
}

document.getElementById('form-transacao').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('trans-id').value;
  const corpo = {
    descricao: document.getElementById('trans-desc').value,
    valor: document.getElementById('trans-valor').value,
    tipo: document.getElementById('trans-tipo').value,
    categoriaId: document.getElementById('trans-categoria').value
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/transacoes/${id}` : '/api/transacoes';

  await api(url, metodo, corpo);

  cancelarEdicao('form-transacao');
  carregarTudo(); // recarrega tudo porque o saldo também muda as metas
});

function editarTransacao(id) {
  const t = transacoes.find(item => item.id === id);
  document.getElementById('trans-id').value = t.id;
  document.getElementById('trans-desc').value = t.descricao;
  document.getElementById('trans-valor').value = t.valor;
  document.getElementById('trans-tipo').value = t.tipo;
  document.getElementById('trans-categoria').value = t.categoriaId;
  modoEdicao('form-transacao', true);
}

async function deletarTransacao(id) {
  await api(`/api/transacoes/${id}`, 'DELETE');
  carregarTudo();
}

// --- METAS ---
async function carregarMetas() {
  const dados = await api('/api/metas');

  const lista = document.getElementById('lista-metas');
  lista.innerHTML = '';
  metas = [];

  dados.forEach(item => {
    const meta = new Meta(item.id, item.titulo, item.valorAlvo, item.valorAtual);
    metas.push(meta);

    // Barra de progresso: valor já investido / valor alvo
    const porcentagem = meta.getPorcentagem();

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="meta-info">
        <strong>${limpar(meta.titulo)}</strong>
        <small>${moeda(meta.valorAtual)} de ${moeda(meta.valorAlvo)} · ${porcentagem.toFixed(0)}% alcançado</small>
        <div class="barra"><div style="width: ${porcentagem}%"></div></div>
      </div>
      <span>
        <button class="btn-icone" title="Editar" onclick="editarMeta('${meta.id}')">✎</button>
        <button class="btn-icone excluir" title="Excluir" onclick="deletarMeta('${meta.id}')">✕</button>
      </span>`;
    lista.appendChild(li);
  });

  mostrarVazio('vazio-metas', metas.length);
}

document.getElementById('form-meta').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('meta-id').value;
  const corpo = {
    titulo: document.getElementById('meta-titulo').value,
    valorAlvo: document.getElementById('meta-valor').value,
    valorAtual: document.getElementById('meta-atual').value || 0
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/metas/${id}` : '/api/metas';

  await api(url, metodo, corpo);

  cancelarEdicao('form-meta');
  carregarTudo();
});

function editarMeta(id) {
  const meta = metas.find(m => m.id === id);
  document.getElementById('meta-id').value = meta.id;
  document.getElementById('meta-titulo').value = meta.titulo;
  document.getElementById('meta-valor').value = meta.valorAlvo;
  document.getElementById('meta-atual').value = meta.valorAtual;
  modoEdicao('form-meta', true);
}

async function deletarMeta(id) {
  await api(`/api/metas/${id}`, 'DELETE');
  carregarTudo();
}

// Inicializa tudo ao abrir a página
// (transações primeiro, porque as metas usam o saldo total)
async function carregarTudo() {
  await carregarTransacoes();
  await carregarCategorias();
  await carregarMetas();
}
