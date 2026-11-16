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
  constructor(id, titulo, valorAlvo) {
    this.id = id;
    this.titulo = titulo;
    this.valorAlvo = parseFloat(valorAlvo);
  }
}

// ==========================================
// MANIPULAÇÃO DO DOM E REQUISIÇÕES (FETCH)
// ==========================================

// --- CATEGORIAS ---
async function carregarCategorias() {
  const res = await fetch('/api/categorias');
  const dados = await res.json();

  const lista = document.getElementById('lista-categorias');
  const select = document.getElementById('trans-categoria');
  lista.innerHTML = '';
  select.innerHTML = '<option value="">Selecione uma categoria...</option>';

  dados.forEach(item => {
    const cat = new Categoria(item.id, item.nome);

    // Adiciona na lista
    const li = document.createElement('li');
    li.innerHTML = `${cat.nome} 
      <button onclick="editarCategoria('${cat.id}', '${cat.nome}')">Editar</button>
      <button onclick="deletarCategoria('${cat.id}')">Excluir</button>`;
    lista.appendChild(li);

    // Adiciona no <select> de transações
    const option = document.createElement('option');
    option.value = cat.id;
    option.innerText = cat.nome;
    select.appendChild(option);
  });
}

document.getElementById('form-categoria').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('cat-id').value;
  const nome = document.getElementById('cat-nome').value;

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/categorias/${id}` : '/api/categorias';

  await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  });

  document.getElementById('cat-id').value = '';
  document.getElementById('cat-nome').value = '';
  carregarTudo();
});

function editarCategoria(id, nome) {
  document.getElementById('cat-id').value = id;
  document.getElementById('cat-nome').value = nome;
}

async function deletarCategoria(id) {
  await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
  carregarTudo();
}

// --- TRANSAÇÕES (COM JOIN) ---
async function carregarTransacoes() {
  const res = await fetch('/api/transacoes');
  const dados = await res.json();

  const lista = document.getElementById('lista-transacoes');
  lista.innerHTML = '';
  let saldoTotal = 0;

  dados.forEach(item => {
    const t = new Transacao(item.id, item.descricao, item.valor, item.tipo, item.categoriaId, item.categoriaNome);
    saldoTotal += t.getValorComSinal();

    const li = document.createElement('li');
    li.innerHTML = `<strong>${t.descricao}</strong> - R$ ${t.valor.toFixed(2)} (${t.tipo}) 
      | Categoria: <em>${t.categoriaNome}</em>
      <button onclick="editarTransacao('${t.id}', '${t.descricao}', ${t.valor}, '${t.tipo}', '${t.categoriaId}')">Editar</button>
      <button onclick="deletarTransacao('${t.id}')">Excluir</button>`;
    lista.appendChild(li);
  });

  document.getElementById('resumo').innerText = `Saldo Total: R$ ${saldoTotal.toFixed(2)}`;
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

  await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  document.getElementById('form-transacao').reset();
  document.getElementById('trans-id').value = '';
  carregarTransacoes();
});

function editarTransacao(id, desc, valor, tipo, catId) {
  document.getElementById('trans-id').value = id;
  document.getElementById('trans-desc').value = desc;
  document.getElementById('trans-valor').value = valor;
  document.getElementById('trans-tipo').value = tipo;
  document.getElementById('trans-categoria').value = catId;
}

async function deletarTransacao(id) {
  await fetch(`/api/transacoes/${id}`, { method: 'DELETE' });
  carregarTransacoes();
}

// --- METAS ---
async function carregarMetas() {
  const res = await fetch('/api/metas');
  const dados = await res.json();

  const lista = document.getElementById('lista-metas');
  lista.innerHTML = '';

  dados.forEach(item => {
    const meta = new Meta(item.id, item.titulo, item.valorAlvo);
    const li = document.createElement('li');
    li.innerHTML = `${meta.titulo} - Alvo: R$ ${meta.valorAlvo.toFixed(2)}
      <button onclick="editarMeta('${meta.id}', '${meta.titulo}', ${meta.valorAlvo})">Editar</button>
      <button onclick="deletarMeta('${meta.id}')">Excluir</button>`;
    lista.appendChild(li);
  });
}

document.getElementById('form-meta').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('meta-id').value;
  const corpo = {
    titulo: document.getElementById('meta-titulo').value,
    valorAlvo: document.getElementById('meta-valor').value
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `/api/metas/${id}` : '/api/metas';

  await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  document.getElementById('form-meta').reset();
  document.getElementById('meta-id').value = '';
  carregarMetas();
});

function editarMeta(id, titulo, valor) {
  document.getElementById('meta-id').value = id;
  document.getElementById('meta-titulo').value = titulo;
  document.getElementById('meta-valor').value = valor;
}

async function deletarMeta(id) {
  await fetch(`/api/metas/${id}`, { method: 'DELETE' });
  carregarMetas();
}

// Inicializa tudo ao abrir a página
function carregarTudo() {
  carregarCategorias();
  carregarTransacoes();
  carregarMetas();
}

carregarTudo();
