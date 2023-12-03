import mysql from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()

// With dotenv, you can create a .env file containing the values for your sql server
// (My .env file below)
// MYSQL_HOST='127.0.0.1' OR MYSQL_HOST='localhost'
// MYSQL_USER='root'
// MYSQL_PASSWORD='Root2112'
// MYSQL_DATABASE='bookie_jar'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}).promise()


//Test queries!
// **********************************************************************************************
loginAndGetLibrary("Mike", "Pass")
    .then(books => {
          console.log("Logged in", books)
    })

// Example of querying for books with genre being fiction
// getAllBooksLike("fiction").then(r => console.log("Get All Books Like:", r))

// Example of adding book to database
// addBook(1, "Hunger Games", "George Lucas", 2016, "fiction").then(r => console.log("added", r))
// addUser("Benson", "Beans").then(r=>{
//   console.log("user added with user_id:", r.insertId)
// })
// **********************************************************************************************


// Function that will be called most often, will return array of books belonging to the user.
export async function loginAndGetLibrary(username, password){
  
  let result = await validateUser(username, password)
  // result is {exists: boolean, user_id: n}
  if(result.exists){
    // returns an array containing each book[{ }, { }, { },...]
    return await getLibrary(result.user_id)
  }
  else
    return []
  
}

// Returns an object which contains a boolean for whether this user exists in the db
// and an integer for the unique user_id for that user.
export async function validateUser(username, password){
  let query = "SELECT * FROM user WHERE username = '"
  query = query + username + "' AND password = '"
  query = query + password + "';"
  const [user] = await pool.query(query)
  let user_id = 0
  if(user[0]){ //user exists
    user_id = user[0].user_id
  }
  console.log("USER ID:", user_id)

  return {exists: user[0], user_id: user_id}
}

export async function getLibrary(user_id){
  let library;
  // Find CollectionID for user
  await getCollectionID(user_id).then(async collectionID => {
    // Find bookIDs belonging to that collection
    await getBookIds(collectionID).then(async bookIDs => {
      // Get an array of all books belonging to user.
      await getAllBooksInCollection(bookIDs).then(result => {
        library = result
      })
    })
  })
  return library
}

export async function getCollectionID(user_id){
  let query = "SELECT * FROM collection WHERE user_id = " + user_id
  const [collection] = await pool.query(query)
  
  let collectionIdArray = []
  
  for (let i = 0; i < collection.length; i++){
    collectionIdArray.push(collection[i].collection_id)
  }
  
  return collectionIdArray
}

export async function getBookIds(collection_id){
  // collection_book is a table linking many books to many collections.
  let query = "SELECT book_id FROM collection_book WHERE collection_id = " + collection_id
  const [bookIDs] = await pool.query(query)
  return [bookIDs]
}

// Returns array of books with genre column matching the input
export async function getAllBooksLike(genre){
  const input = "%" + genre + "%"
  const [books] = await pool.query(`
  SELECT * 
  FROM book
  WHERE genre LIKE ?
  `, [input])
  return books
}

// Returns an array containing all of the books from an array of bookIDs
export async function getAllBooksInCollection(bookIDs){
  let books = []
  let id_values = []
  for(let i = 0; i < bookIDs[0].length; i++){
    id_values.push(bookIDs[0][i].book_id)
  }
  for (let i = 0; i < id_values.length; i ++){
    let entry = await getBook(id_values[i])
    books.push(entry)
  }
  return books
}

// Return all books from the database
export async function getBooks() {
  const [books] = await pool.query("SELECT * FROM book")
  return books
}

// Return a specific book from database
export async function getBook(id) {
  const [books] = await pool.query(`
  SELECT * 
  FROM book
  WHERE book_id = ?
  `, [id])
  return books[0]
}


export async function addUser(username, password) {
  const [rows] = await pool.query(`
  INSERT INTO user (username, password)
  VALUES ( ?, ?)
  `, [username, password])
  const id = rows.insertId
  return rows
}

export async function addBook(user_id, name, author, year, genre) {
  const [rows] = await pool.query(`
  INSERT INTO book (name, author, year, genre)
  VALUES (?, ?, ?, ?)
  `, [name, author, year, genre])
  const id = rows.insertId
  const collection_id = await getCollectionID(user_id)

  // Database has a collection_book table linking many books to many collections.
  await addBookToCollection(id, collection_id)
  return id
}

async function addBookToCollection(bookID, collectionID){
  const [rows] = await pool.query(`
  INSERT INTO collection_book (book_id, collection_id)
  VALUES (?, ?)
  `, [bookID, collectionID])
  const id = rows.insertId
  return id
}