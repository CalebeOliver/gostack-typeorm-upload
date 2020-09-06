import { EntityRepository, Repository, getCustomRepository } from 'typeorm';

import Category from '../models/Category';

@EntityRepository(Category)
class CategoriesRepository extends Repository<Category> {
  public async findOrCreate(title: string): Promise<Category> {
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    let category = await categoriesRepository.findOne({
      where: {
        title,
      },
    });

    if (category) return category;

    category = categoriesRepository.create({ title });
    await categoriesRepository.save(category);

    return category;
  }
}

export default CategoriesRepository;
