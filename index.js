require('dotenv').config()
const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const { Server } = require('socket.io')
const http = require('http');
const { ObjectId } = require('mongodb');

const app = express()


const port = process.env.PORT || 5000
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173','https://daily-todo-cd82f.web.app'],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
})

app.use(cors())
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.kpzks.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db('scic-todo').collection('users')
    const todoCollection = client.db('scic-todo').collection('todo')


    // -----------user first regist data store databas ------------------//

    app.post('/signup', async (req, res) => {
      const data = req.body;
   
      const findEmail = await userCollection.findOne({ email: data.email })
      if (!findEmail) {
        const result = await userCollection.insertOne(data)
        res.send(result)
      }
      else {
        res.send({ msg: "Already user add" })
      }
    })

    // -----------user add task store databas ------------------//
    app.post('/tasks', async (req, res) => {
      const { title, description, category, timestamp, email } = req.body;
      try {
        const findCatgory = await todoCollection.find({ category: category }).toArray()
        const task = {
          title: title,
          description: description,
          category: category,
          timestamp: timestamp,
          email: email,
          order:findCatgory.length + 1
        }
        const result = await todoCollection.insertOne(task)
        res.send(result)
      } catch (error) {
      
      }

    })

    // -----------user view task  ------------------//
    app.get('/tasks', async (req, res) => {
      const email = req.query
      
      if (!email){
        res.status(404).json("Not provided Email")
        return
      }
      else{
      const result = await todoCollection.find(email).sort({ order:1 }).toArray()
      res.send(result)  
      }
    })

    app.put('/tasks/:id', async (req, res) => {
      const data = req.body;
      const params = req.params

      const findData = await todoCollection.updateOne({ _id: new ObjectId(params) },
        {
          $set: {
            title: data.title,
            description: data.description,
            category: data.category,
            timestamp: data.timestamp
          }
        }
      )
     

      res.send(findData)
    })

    app.delete('/tasks/:id', async (req, res) => {
      const params = req.params;
      const result = await todoCollection.deleteOne({ _id: new ObjectId(params) })
      res.send(result)
    })


    io.on("connection", (socket) => {
      

      socket.on("updateTask", async (data) => {
        try {
        

          // Map category names to database values
          let tempCategory = "";
          if (data[1].id === "In Progress") tempCategory = "inprogress";
          else if (data[1].id === "To-Do") tempCategory = "todo";
          else if (data[1].id === "Done") tempCategory = "done";
        
         let order;
          try {
            order = (await todoCollection.find({category:tempCategory}).toArray()).length
          } catch (error) {
            
          }
        
          // Update task in MongoDB
          const result = await todoCollection.updateOne(
            { _id: new ObjectId(data[0].id._id) },
            { $set: { category: tempCategory, order:order+1 } }
          );

          if (result.modifiedCount > 0) {
          
            // io.emit("receiveTask", data);
          } else {
            
          }
        } catch (error) {
          console.error("Error updating task:", error);
        }
      });

      socket.on('updateOrderTask', async (data) => {
 
        data[0].map( async(item, idx )=> {
         
        const res=  await todoCollection.updateOne({_id: new ObjectId(item._id)}, 
        {
          $set: {order: idx+1}
        })
      })
    
      



      })

      socket.on("disconnect", () => console.log("User disconnected"));
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


server.listen(port, () => { console.log("Port Running", port); })
