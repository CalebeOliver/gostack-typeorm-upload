import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, Raw } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface CSVProps {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    try {
      const contactsReadStream = fs.createReadStream(path);
      const parses = csvParse({ from_line: 2 });

      const transactions: CSVProps[] = [];
      const categories: string[] = [];

      const parseCVS = contactsReadStream.pipe(parses);
      parseCVS.on('data', async line => {
        const [title, type, value, category] = line.map((cell: string) =>
          cell.trim(),
        );
        if (!title || !type || !value) return;

        categories.push(category);

        transactions.push({ title, type, value, category });
      });

      await new Promise(resolve => parseCVS.on('end', resolve));

      const transactionsRepository = getCustomRepository(TransactionRepository);

      const categoryRepository = getCustomRepository(CategoriesRepository);

      const existentCategories = await categoryRepository.find({
        where: {
          title: Raw(alias => `${alias} in('${categories.join("','")}')`),
        },
      });

      const existentCategoriesTitles = existentCategories.map(
        (category: Category) => category.title,
      );

      const addCategoriesTitles = categories
        .filter(category => !existentCategoriesTitles.includes(category))
        .filter((value, index, self) => self.indexOf(value) === index);

      const newCategories = categoryRepository.create(
        addCategoriesTitles.map(title => ({ title })),
      );

      await categoryRepository.save(newCategories);

      const finalCategories = [...newCategories, ...existentCategories];

      const newTransactions = transactionsRepository.create(
        transactions.map(transaction => ({
          title: transaction.title,
          type: transaction.type,
          value: transaction.value,
          category: finalCategories.find(
            category => category.title === transaction.category,
          ),
        })),
      );

      await transactionsRepository.save(newTransactions);

      await fs.promises.unlink(path);

      return newTransactions;
    } catch (err) {
      throw new AppError('Ocorreu um erro durante a importação do arquivo');
    }
  }
}

export default ImportTransactionsService;
