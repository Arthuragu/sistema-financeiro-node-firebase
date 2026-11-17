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
// 1. CRUD DE CATEGORIAS (Coleção: categorias)
// ==========================================
app.get('/api/categorias', async (req, res) => {
  const snapshot = await db.collection('categorias').get();
  const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(lista);
});

app.post('/api/categorias', async (req, res) => {
  const docRef = await db.collection('categorias').add({ nome: req.body.nome });
  res.json({ id: docRef.id, nome: req.body.nome });
});

app.put('/api/categorias/:id', async (req, res) => {
  await db.collection('categorias').doc(req.params.id).update({ nome: req.body.nome });
  res.json({ id: req.params.id, nome: req.body.nome });
});

app.delete('/api/categorias/:id', async (req, res) => {
  await db.collection('categorias').doc(req.params.id).delete();
  res.json({ mensagem: 'Categoria removida' });
});

// ==========================================
// 2. CRUD DE TRANSAÇÕES COM JOIN (Coleção: transacoes)
// ==========================================
app.get('/api/transacoes', async (req, res) => {
  // Busca transações e categorias para fazer o JOIN
  const transacoesSnap = await db.collection('transacoes').get();
  const categoriasSnap = await db.collection('categorias').get();

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
  const docRef = await db.collection('transacoes').add(nova);
  res.json({ id: docRef.id, ...nova });
});

app.put('/api/transacoes/:id', async (req, res) => {
  const atualizada = {
    descricao: req.body.descricao,
    valor: parseFloat(req.body.valor),
    tipo: req.body.tipo,
    categoriaId: req.body.categoriaId
  };
  await db.collection('transacoes').doc(req.params.id).update(atualizada);
  res.json({ id: req.params.id, ...atualizada });
});

app.delete('/api/transacoes/:id', async (req, res) => {
  await db.collection('transacoes').doc(req.params.id).delete();
  res.json({ mensagem: 'Transação removida' });
});

// ==========================================
// 3. CRUD DE METAS (Coleção: metas)
// ==========================================
app.get('/api/metas', async (req, res) => {
  const snapshot = await db.collection('metas').get();
  const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(lista);
});

app.post('/api/metas', async (req, res) => {
  const nova = {
    titulo: req.body.titulo,
    valorAlvo: parseFloat(req.body.valorAlvo)
  };
  const docRef = await db.collection('metas').add(nova);
  res.json({ id: docRef.id, ...nova });
});

app.put('/api/metas/:id', async (req, res) => {
  const atualizada = {
    titulo: req.body.titulo,
    valorAlvo: parseFloat(req.body.valorAlvo)
  };
  await db.collection('metas').doc(req.params.id).update(atualizada);
  res.json({ id: req.params.id, ...atualizada });
});

app.delete('/api/metas/:id', async (req, res) => {
  await db.collection('metas').doc(req.params.id).delete();
  res.json({ mensagem: 'Meta removida' });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
