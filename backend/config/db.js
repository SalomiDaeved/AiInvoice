import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://sssalomi99_db_user:invoice123@cluster0.h3a4af1.mongodb.net/InvoiceAI');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};