import express from 'express'
import {getBooks, getBook, addBook} from './database.js'

const app = express()

app.use(express.json())

app.get("/book", async (req, res) => {
  const books = await getBooks()
  res.send(books)
})

app.get("/book/:id", async (req, res) => {
  const id = req.params.id
  const book = await getBook(id)
  res.send(book)
})

app.post("/book", async (req, res) => {
  const { user_id, name, author, year, genre } = req.body
  const book = await addBook(user_id, name, author, year, genre)
  res.status(201).send(book)
})


app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Error')
})

app.listen(8080, () => {
  console.log('Server is running on port 8080')
})