let courses = [];
let tutors = [];
let orders = [];
let ordersPage = 1;
let orderToDelete = null;

const ordersBody = document.querySelector('.orders-body');
const ordersEmpty = document.querySelector('.orders-empty');
const ordersPagination = document.querySelector('.orders-pagination');
const detailsModal = document.querySelector('.details-modal');
const deleteModal = document.querySelector('.delete-modal');

function findCourse(id) {
  return courses.find(function (course) {
    return course.id === id;
  }) || null;
}

function findTutor(id) {
  return tutors.find(function (tutor) {
    return tutor.id === id;
  }) || null;
}

function orderCourse(order) {
  return order.course_id ? findCourse(order.course_id) : null;
}

function orderTutor(order) {
  return order.tutor_id ? findTutor(order.tutor_id) : null;
}

function orderTitle(order) {
  const course = orderCourse(order);

  if (course) {
    return course.name;
  }

  const tutor = orderTutor(order);
  return tutor ? 'Занятия с репетитором ' + tutor.name : 'Заявка № ' + order.id;
}

function orderRequest(order) {
  const course = orderCourse(order);
  const tutor = orderTutor(order);

  const options = {};

  OPTIONS.forEach(function (option) {
    options[option.field] = Boolean(order[option.field]);
  });

  return {
    dateStart: order.date_start.slice(0, 10),
    timeStart: formatTime(order.time_start),
    persons: order.persons,
    weeks: course ? course.total_length : 1,
    hours: order.duration,
    feePerHour: course ? course.course_fee_per_hour : (tutor ? tutor.price_per_hour : 0),
    options: options
  };
}

function createOrderRow(order, number) {
  const row = createElement('tr');
  row.dataset.order = String(order.id);

  row.append(createElement('td', 'fw-semibold', String(number).padStart(3, '0')));
  row.append(createElement('td', null, orderTitle(order)));
  row.append(createElement('td', null, formatDate(order.date_start) + ', ' + formatTime(order.time_start)));
  row.append(createElement('td', null, formatPrice(order.price)));

  const actions = createElement('td');
  const group = createElement('div', 'd-flex flex-wrap gap-2');

  [
    { text: 'Подробнее', action: 'details', style: 'btn-info' },
    { text: 'Изменить', action: 'edit', style: 'btn-warning' },
    { text: 'Удалить', action: 'delete', style: 'btn-danger' }
  ].forEach(function (item) {
    const button = createElement('button', 'btn btn-sm text-nowrap ' + item.style, item.text);
    button.type = 'button';
    button.dataset.action = item.action;
    group.append(button);
  });

  actions.append(group);
  row.append(actions);

  return row;
}

function renderOrders() {
  const pages = pageCount(orders.length);

  if (ordersPage > pages) {
    ordersPage = pages;
  }

  ordersBody.innerHTML = '';

  pageItems(orders, ordersPage).forEach(function (order, index) {
    ordersBody.append(createOrderRow(order, (ordersPage - 1) * PAGE_SIZE + index + 1));
  });

  ordersEmpty.classList.toggle('d-none', orders.length > 0);
  renderPagination(ordersPagination, ordersPage, pages, function (page) {
    ordersPage = page;
    renderOrders();
  });
}

async function loadOrders() {
  orders = (await getOrders()).sort(function (first, second) {
    return first.id - second.id;
  });

  renderOrders();
}

function addDetailsRow(list, title, value) {
  list.append(createElement('dt', 'col-sm-5 fw-semibold', title));
  list.append(createElement('dd', 'col-sm-7', value));
}

function showDetails(order) {
  const body = detailsModal.querySelector('.details-modal__body');
  body.innerHTML = '';

  const course = orderCourse(order);
  const tutor = orderTutor(order);
  const request = orderRequest(order);
  const price = calculatePrice(request);

  body.append(createElement('h3', 'h5 fw-bold mb-2', orderTitle(order)));

  if (course) {
    body.append(createElement('p', 'text-secondary', course.description));
  } else if (tutor) {
    body.append(createElement('p', 'text-secondary',
      'Преподаёт: ' + languageList(tutor.languages_offered) +
      '. Владеет: ' + languageList(tutor.languages_spoken) +
      '. Опыт работы: ' + tutor.work_experience + ' лет.'));
  }

  const summary = createElement('dl', 'row mb-4');
  addDetailsRow(summary, 'Дата занятия', formatDate(order.date_start));
  addDetailsRow(summary, 'Время занятия',
    formatTime(order.time_start) + ' — ' + addHours(formatTime(order.time_start), course ? course.week_length : order.duration));

  if (course) {
    addDetailsRow(summary, 'Уровень курса', levelName(course.level));
    addDetailsRow(summary, 'Преподаватель', course.teacher);
    addDetailsRow(summary, 'Продолжительность',
      course.total_length + ' недель, последнее занятие ' + formatDate(lastLessonDate(request.dateStart, course.total_length)));
  }

  addDetailsRow(summary, 'Всего часов', String(order.duration));
  addDetailsRow(summary, 'Количество студентов', String(order.persons));
  body.append(summary);

  body.append(createElement('h4', 'h6 fw-bold mb-2', 'Расчёт стоимости'));

  const basis = createElement('ul', 'list-unstyled text-secondary mb-2');

  price.basis.forEach(function (item) {
    basis.append(createElement('li', null, item.title + ': ' + item.note));
  });

  basis.append(createElement('li', 'text-body fw-semibold', 'Базовая стоимость: ' + formatPrice(price.base)));
  body.append(basis);

  if (price.changes.length > 0) {
    const changes = createElement('ul', 'list-unstyled mb-2');

    price.changes.forEach(function (item) {
      const sign = item.amount < 0 ? '−' : '+';
      changes.append(createElement('li', item.amount < 0 ? 'text-success' : 'text-danger',
        item.title + ': ' + sign + formatPrice(Math.abs(item.amount))));
    });

    body.append(createElement('p', 'fw-semibold mb-1', 'Скидки и надбавки'));
    body.append(changes);
  } else {
    body.append(createElement('p', 'text-secondary', 'Скидки и надбавки не применялись.'));
  }

  const total = createElement('p', 'fs-5 fw-bold mb-0', 'Итоговая стоимость: ' + formatPrice(order.price));
  body.append(total);

  bootstrap.Modal.getOrCreateInstance(detailsModal).show();
}

function showEdit(order) {
  const course = orderCourse(order);
  const tutor = orderTutor(order);

  if (!course && !tutor) {
    showNotification('Не удалось найти курс или репетитора для этой заявки', 'warning');
    return;
  }

  openOrderForm({ course: course, tutor: tutor, order: order, onSave: loadOrders });
}

function showDelete(order) {
  orderToDelete = order;
  bootstrap.Modal.getOrCreateInstance(deleteModal).show();
}

ordersBody.addEventListener('click', async function (event) {
  const button = event.target.closest('button[data-action]');

  if (!button) {
    return;
  }

  const id = Number(button.closest('tr').dataset.order);
  let order;

  try {
    order = await getOrder(id);
  } catch (error) {
    showNotification('Не удалось получить заявку. ' + error.message, 'danger');
    return;
  }

  if (button.dataset.action === 'details') {
    showDetails(order);
  } else if (button.dataset.action === 'edit') {
    showEdit(order);
  } else {
    showDelete(order);
  }
});

deleteModal.querySelector('.delete-modal__confirm').addEventListener('click', async function (event) {
  const button = event.target;
  button.disabled = true;

  try {
    await deleteOrder(orderToDelete.id);
  } catch (error) {
    showNotification('Не удалось удалить заявку. ' + error.message, 'danger');
    return;
  } finally {
    button.disabled = false;
  }

  bootstrap.Modal.getOrCreateInstance(deleteModal).hide();
  showNotification('Заявка успешно удалена', 'success');
  await loadOrders();
});

document.addEventListener('DOMContentLoaded', async function () {
  try {
    courses = await getCourses();
    tutors = await getTutors();
    await loadOrders();
  } catch (error) {
    showNotification('Не удалось загрузить заявки. ' + error.message, 'danger');
  }
});
