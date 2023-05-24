import mongoose from 'mongoose';

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB: Connectted'))
  .catch((err) => console.log(err.message));

const db = mongoose.connection;

export default db;