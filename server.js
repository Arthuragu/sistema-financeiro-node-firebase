const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicializa o Firebase com a chave baixada do Console do Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());
// Faz a página inicial (/) abrir direto no login.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});
app.use(express.static('public')); // Serve o HTML, CSS e JS

// ==========================================
// AUTENTICAÇÃO (Verifica o token do usuário logado)
// ==========================================
async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.replace('Bearer ', '');

  try {
    const usuario = await admin.auth().verifyIdToken(token);
    req.uid = usuario.uid;
    next();
  } catch (erro) {
    res.status(401).json({ mensagem: 'Usuário não autenticado' });
  }
}

app.use('/api', autenticar);

// Busca um documento e confere se ele pertence ao usuário logado
async function buscarDoUsuario(colecao, id, uid) {
  const doc = await db.collection(colecao).doc(id).get();
  if (!doc.exists || doc.data().userId !== uid) {
    return null;
  }
  return doc;
}

// ==========================================
// 1. CRUD DE CATEGORIAS (Coleção: categorias)
// ==========================================
app.get('/api/categorias', async (req, res) => {
  const snapshot = await db.collection('categorias').where('userId', '==', req.uid).get();
  const lista = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
  res.json(lista);
});

app.post('/api/categorias', async (req, res) => {
  const docRef = await db.collection('categorias').add({ nome: req.body.nome, userId: req.uid });
  res.json({ id: docRef.id, nome: req.body.nome });
});

app.put('/api/categorias/:id', async (req, res) => {
  const doc = await buscarDoUsuario('categorias', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Categoria não encontrada' });
  }
  await doc.ref.update({ nome: req.body.nome });
  res.json({ id: req.params.id, nome: req.body.nome });
});

app.delete('/api/categorias/:id', async (req, res) => {
  const doc = await buscarDoUsuario('categorias', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Categoria não encontrada' });
  }
  await doc.ref.delete();
  res.json({ mensagem: 'Categoria removida' });
});

// ==========================================
// 2. CRUD DE TRANSAÇÕES COM JOIN (Coleção: transacoes)
// ==========================================
app.get('/api/transacoes', async (req, res) => {
  // Busca transações e categorias para fazer o JOIN
  const transacoesSnap = await db.collection('transacoes').where('userId', '==', req.uid).get();
  const categoriasSnap = await db.collection('categorias').where('userId', '==', req.uid).get();

  // Mapeia categorias por ID para facilitar o Join
  const mapaCategorias = {};
  categoriasSnap.forEach(doc => {
    mapaCategorias[doc.id] = doc.data().nome;
  });

  // Monta o resultado fazendo o JOIN entre transação e categoria
  const resultadoComJoin = transacoesSnap.docs.map(doc => {
    const dados = doc.data();
    return {
      id: doc.id,
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      categoriaId: dados.categoriaId,
      categoriaNome: mapaCategorias[dados.categoriaId] || 'Sem Categoria' // <-- JOIN AQUI
    };
  });

  res.json(resultadoComJoin);
});

app.post('/api/transacoes', async (req, res) => {
  const nova = {
    descricao: req.body.descricao,
    valor: parseFloat(req.body.valor),
    tipo: req.body.tipo,
    categoriaId: req.body.categoriaId
  };
  const docRef = await db.collection('transacoes').add({ ...nova, userId: req.uid });
  res.json({ id: docRef.id, ...nova });
});

app.put('/api/transacoes/:id', async (req, res) => {
  const doc = await buscarDoUsuario('transacoes', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Transação não encontrada' });
  }
  const atualizada = {
    descricao: req.body.descricao,
    valor: parseFloat(req.body.valor),
    tipo: req.body.tipo,
    categoriaId: req.body.categoriaId
  };
  await doc.ref.update(atualizada);
  res.json({ id: req.params.id, ...atualizada });
});

app.delete('/api/transacoes/:id', async (req, res) => {
  const doc = await buscarDoUsuario('transacoes', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Transação não encontrada' });
  }
  await doc.ref.delete();
  res.json({ mensagem: 'Transação removida' });
});

// ==========================================
// 3. CRUD DE METAS (Coleção: metas)
// ==========================================
app.get('/api/metas', async (req, res) => {
  const snapshot = await db.collection('metas').where('userId', '==', req.uid).get();
  const lista = snapshot.docs.map(doc => ({
    id: doc.id,
    titulo: doc.data().titulo,
    valorAlvo: doc.data().valorAlvo,
    valorAtual: doc.data().valorAtual || 0 // metas antigas não têm esse campo
  }));
  res.json(lista);
});

app.post('/api/metas', async (req, res) => {
  const nova = {
    titulo: req.body.titulo,
    valorAlvo: parseFloat(req.body.valorAlvo),
    valorAtual: parseFloat(req.body.valorAtual) || 0
  };
  const docRef = await db.collection('metas').add({ ...nova, userId: req.uid });
  res.json({ id: docRef.id, ...nova });
});

app.put('/api/metas/:id', async (req, res) => {
  const doc = await buscarDoUsuario('metas', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Meta não encontrada' });
  }
  const atualizada = {
    titulo: req.body.titulo,
    valorAlvo: parseFloat(req.body.valorAlvo),
    valorAtual: parseFloat(req.body.valorAtual) || 0
  };
  await doc.ref.update(atualizada);
  res.json({ id: req.params.id, ...atualizada });
});

app.delete('/api/metas/:id', async (req, res) => {
  const doc = await buscarDoUsuario('metas', req.params.id, req.uid);
  if (!doc) {
    return res.status(404).json({ mensagem: 'Meta não encontrada' });
  }
  await doc.ref.delete();
  res.json({ mensagem: 'Meta removida' });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
