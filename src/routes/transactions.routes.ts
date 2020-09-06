import { Router } from 'express';
import multer from 'multer';

import { getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
// import CategoriesRepository from '../repositories/CategoriesRepository';
import ImportTransactionsService from '../services/ImportTransactionsService';

import uploadConfig from '../config/upload';

const upload = multer(uploadConfig);

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const customRepository = getCustomRepository(TransactionsRepository);
  const transactions = await customRepository.find();
  const balance = await customRepository.getBalance();
  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  try {
    const { title, value, type, category } = request.body;
    const createTransaction = new CreateTransactionService();
    const transaction = await createTransaction.execute({
      title,
      value,
      type,
      category,
    });
    return response.json(transaction);
  } catch (err) {
    return response
      .status(err.statusCode)
      .json({ status: 'error', message: err.message });
  }
});

transactionsRouter.delete('/:id', async (request, response) => {
  try {
    const { id } = request.params;
    const deleteTransaction = new DeleteTransactionService();
    await deleteTransaction.execute(id);
    return response.status(204).send();
  } catch (err) {
    return response.status(err.status).send(err.message);
  }
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    try {
      const importTransactions = new ImportTransactionsService();
      const transactions = await importTransactions.execute(request.file.path);
      return response.json(transactions);
    } catch (err) {
      console.log(err);
    }
  },
);

export default transactionsRouter;
