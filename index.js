const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer'); //used for handling files
const uploadMiddleware = multer({ dest: './uploads/' }); //save file to /uploads/
const fs = require('fs');

const app = express();
const saltRounds = 12;
const secret = 'thisisnotagoodsecret';

app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose
  .connect(
    'mongodb+srv://blogapp:NbQd7lsOq3priYmg@mernblog.vwqfeof.mongodb.net/'
  )
  .then(() => console.log('Connected to database'));

//Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = await User.create({
      username,
      password: bcrypt.hashSync(password, saltRounds),
    });
    res.json(newUser);
  } catch (e) {
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const foundUser = await User.findOne({ username });
  const passwordMatch = bcrypt.compareSync(password, foundUser.password);
  if (passwordMatch) {
    //logged in

    await jwt.sign(
      { username, id: foundUser._id },
      secret,
      {},
      (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id: foundUser._id,
          username,
        });
      }
    );
  } else res.status(402).json({ message: 'wrong credentials' });
});

app.get('/profile', async (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, secret, {}, (err, info) => {
      if (err) throw err;
      res.json(info);
    });
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'ok' });
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  //name of file in request

  const { originalname: fileName, path } = req.file;
  const { title, summary, content } = req.body;

  const fileExtension = fileName.split('.')[1];
  const newPath = path + '.' + fileExtension;

  fs.renameSync(path, newPath);

  const { token } = req.cookies;

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    try {
      const newPost = await Post.create({
        title,
        summary,
        content,
        image: newPath,
        author: info.id,
      });
      res.json(newPost);
    } catch (error) {
      throw err;
    }
  });
});

app.get('/posts', async (req, res) => {
  const posts = await Post.find()
    .populate('author', ['username'])
    .sort({ createdAt: -1 }) //sorts in descending order to get latest post first
    .limit(20);
  res.json(posts);
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id).populate('author', ['username']);
  res.json(post);
});

app.put('/posts', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname: fileName, path } = req.file;
    const { title, summary, content } = req.body;
    const fileExtension = fileName.split('.')[1];
    newPath = path + '.' + fileExtension;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const foundPost = await Post.findById(id);
    const isAuthor = foundPost.author == info.id;
    //loose comparison because author is of type ObjectId

    if (!isAuthor) {
      res.status(401).json({ message: 'You are not the author of this post!' });
    }

    await Post.findByIdAndUpdate(id, {
      title,
      summary,
      content,
      image: newPath ? newPath : foundPost.image,
    });
    res.json({ message: 'successfully updated' });
  });
});

app.listen(8080, () => console.log('Listening on 8080'));
