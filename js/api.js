const API_URL = 'https://web-basics-exam-gagashaggy.amvera.io/api';
const API_KEY = '7878941a-af5e-4e2c-86f0-4d8c4dc70ba4';

async function sendRequest(path, method, body) {
  const options = { method: method };

  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(API_URL + path + '?api_key=' + API_KEY, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Сервер вернул ошибку ' + response.status);
  }

  return data;
}

async function getCourses() {
  return sendRequest('/courses', 'GET');
}

async function getCourse(id) {
  return sendRequest('/courses/' + id, 'GET');
}

async function getTutors() {
  return sendRequest('/tutors', 'GET');
}

async function getTutor(id) {
  return sendRequest('/tutors/' + id, 'GET');
}

async function getOrders() {
  return sendRequest('/orders', 'GET');
}

async function getOrder(id) {
  return sendRequest('/orders/' + id, 'GET');
}

async function createOrder(order) {
  return sendRequest('/orders', 'POST', order);
}

async function updateOrder(id, order) {
  return sendRequest('/orders/' + id, 'PUT', order);
}

async function deleteOrder(id) {
  return sendRequest('/orders/' + id, 'DELETE');
}
