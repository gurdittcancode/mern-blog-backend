const mongoose = require('mongoose')

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true, //so we have updatedAt and createdAt
  }
)

const Post = new mongoose.model('Post', postSchema)
module.exports = Post
