export const PRODUCTS_WITH_IMAGES_QUERY = `
  query getProductsWithImages($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          productType
          status
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
export const IMAGE_QUERY = `
      query getProductImage($productId: ID!) {
        product(id: $productId) {
          id
          title
          images(first: 50) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    `;

export const FILE_CREATE = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id
            fileStatus
            ... on MediaImage {
              image {
                url
                width
                height
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

export const CREATE_STAGED_UPLOAD_MUTATION = `
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters { name value }
    }
    userErrors { field message }
  }
}
`;

export const CREATE_PRODUCT_MEDIA_MUTATION = `
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media {
      ... on MediaImage {
        id
        image { id url altText }
      }
    }
    mediaUserErrors { field message }
  }
}
`;

export const DELETE_MEDIA_MUTATION = `
mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    userErrors { field message }
  }
}
`;
