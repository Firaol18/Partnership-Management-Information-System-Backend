export function paginate(
  model: any,
  args: any,
  options: { page?: number; perPage?: number },
) {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 10;
  const skip = (page - 1) * perPage;

  return model
    .findMany({ ...args, skip, take: perPage })
    .then(async (data: any[]) => {
      const total = await model.count({ where: args.where });
      return {
        data,
        meta: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
        },
      };
    });
}
