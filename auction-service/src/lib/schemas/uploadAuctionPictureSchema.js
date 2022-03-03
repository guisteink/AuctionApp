const schema = {
    properties: {
       body: {
          type: 'string',
          minLength: 1,
          pattern: '\=$' // this is a regex to verify base64 images
       }
    },
    required: [
       'body',
    ],
 };
 
 export default schema;