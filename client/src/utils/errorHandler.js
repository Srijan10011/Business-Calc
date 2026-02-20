// Utility function to extract error message from API response
export const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  return error.response?.data?.msg || error.response?.data?.message || defaultMessage;
};
