export const PRODUCT_QUERIES = {
  GET_ALL: `{ products(first:10){ edges{ node{ id title description }}}}`,
  GET_SINGLE: `query($id: ID!){ product(id:$id){ id title description }}`,
};

export const PAGE_QUERIES = {
  GET_ALL: `{ pages(first:10){ edges{ node{ id title body }}}}`,
  GET_SINGLE: `query($id: ID!){ page(id:$id){ id title body }}`,
};

export const ARTICLE_QUERIES = {
  GET_ALL: `{ articles(first:10){ edges{ node{ id title body }}}}`,
  GET_SINGLE: `query($id: ID!){ article(id:$id){ id title body }}`,
};

export const PRODUCT_MUTATIONS = {
  UPDATE: `mutation($input: ProductInput!){ productUpdate(input:$input){ product{ id title descriptionHtml } userErrors{ field message }}}`,
};

export const PAGE_MUTATIONS = {
  UPDATE: `mutation($id: ID!, $page: PageUpdateInput!){ pageUpdate(id:$id,page:$page){ page{ id title body } userErrors{ field message }}}`,
};

export const ARTICLE_MUTATIONS = {
  UPDATE: `mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!){ articleUpdate(id:$id, article:$article){ article{ id title body } userErrors{ field message }}}`,
};
