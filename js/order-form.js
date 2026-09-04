const TUTOR_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

let orderModal = null;
let orderContext = null;
let orderControls = null;

function createField(labelText, control) {
  const wrapper = createElement('div', 'mb-3');
  const label = createElement('label', 'form-label', labelText);
  label.setAttribute('for', control.id);
  wrapper.append(label, control);
  return wrapper;
}

function createTextField(id, labelText, value) {
  const control = createElement('input', 'form-control-plaintext border rounded-2 px-2');
  control.id = id;
  control.type = 'text';
  control.value = value;
  control.readOnly = true;
  return createField(labelText, control);
}

function createSelectField(id, labelText, options, value) {
  const control = createElement('select', 'form-select');
  control.id = id;
  control.required = true;

  const empty = createElement('option', null, 'Не выбрано');
  empty.value = '';
  control.append(empty);

  options.forEach(function (option) {
    const item = createElement('option', null, option.text);
    item.value = option.value;
    control.append(item);
  });

  control.value = value || '';
  return { wrapper: createField(labelText, control), control: control };
}

function createNumberField(id, labelText, min, max, value) {
  const control = createElement('input', 'form-control');
  control.id = id;
  control.type = 'number';
  control.min = String(min);
  control.max = String(max);
  control.step = '1';
  control.required = true;
  control.value = String(value);
  return { wrapper: createField(labelText, control), control: control };
}

function createDateField(id, labelText, value) {
  const control = createElement('input', 'form-control');
  control.id = id;
  control.type = 'date';
  control.min = toDateString(new Date());
  control.required = true;
  control.value = value || '';
  return { wrapper: createField(labelText, control), control: control };
}

function createOptionChecks(order) {
  const fieldset = createElement('fieldset', 'mb-3');
  fieldset.append(createElement('legend', 'form-label fs-6 mb-2', 'Дополнительные параметры обучения'));

  const checks = {};

  OPTIONS.forEach(function (option) {
    const wrapper = createElement('div', 'form-check mb-1');

    const input = createElement('input', 'form-check-input');
    input.type = 'checkbox';
    input.id = 'order-option-' + option.field;
    input.checked = Boolean(order && order[option.field]);
    input.disabled = option.automatic;

    const label = createElement('label', 'form-check-label');
    label.setAttribute('for', input.id);
    label.append(createElement('span', null, option.title));
    label.append(createElement('span', 'text-secondary small ms-2', option.note));

    wrapper.append(input, label);
    fieldset.append(wrapper);
    checks[option.field] = input;
  });

  return { wrapper: fieldset, checks: checks };
}

function buildOrderForm(context) {
  const body = document.querySelector('.order-form__body');
  body.innerHTML = '';

  const order = context.order;
  const subject = context.course ? context.course.name : context.tutor.name;
  const dateValue = order ? order.date_start.slice(0, 10) : '';

  body.append(createTextField('order-subject', context.course ? 'Название курса' : 'Репетитор', subject));

  if (context.course) {
    body.append(createTextField('order-teacher', 'Преподаватель', context.course.teacher));
  } else {
    body.append(createTextField('order-level', 'Уровень преподавания', levelName(context.tutor.language_level)));
  }

  let date;

  if (context.course) {
    const dates = courseStartDates(context.course);

    if (dateValue && !dates.includes(dateValue)) {
      dates.push(dateValue);
      dates.sort();
    }

    date = createSelectField('order-date', 'Дата начала курса', dates.map(function (value) {
      return { value: value, text: formatDate(value) };
    }), dateValue);
  } else {
    date = createDateField('order-date', 'Дата занятия', dateValue);
  }

  body.append(date.wrapper);

  const time = createSelectField('order-time', 'Время занятия', [], '');
  time.control.disabled = true;
  body.append(time.wrapper);

  let duration = null;
  let lengthField = null;

  if (context.course) {
    lengthField = createTextField('order-length', 'Продолжительность курса', '');
    body.append(lengthField);
  } else {
    duration = createNumberField('order-duration', 'Продолжительность занятий, часов', 1, 40, order ? order.duration : 1);
    body.append(duration.wrapper);
  }

  const persons = createNumberField('order-persons', 'Количество студентов в группе', 1, 20, order ? order.persons : 1);
  body.append(persons.wrapper);

  const options = createOptionChecks(order);
  body.append(options.wrapper);

  const summary = createElement('div', 'border rounded-3 p-3 bg-light');
  const total = createElement('div', 'd-flex justify-content-between align-items-center fw-bold fs-5');
  total.append(createElement('span', null, 'Итоговая стоимость'));

  const totalValue = createElement('span', 'text-brand', '—');
  total.append(totalValue);

  const breakdown = createElement('ul', 'list-unstyled small text-secondary mb-0 mt-2');
  summary.append(total, breakdown);
  body.append(summary);

  orderControls = {
    date: date.control,
    time: time.control,
    duration: duration ? duration.control : null,
    length: lengthField ? lengthField.querySelector('input') : null,
    persons: persons.control,
    checks: options.checks,
    total: totalValue,
    breakdown: breakdown
  };
}

function fillTimeOptions() {
  const control = orderControls.time;
  const previous = control.value;
  const date = orderControls.date.value;

  control.innerHTML = '';

  const empty = createElement('option', null, date ? 'Не выбрано' : 'Сначала выберите дату');
  empty.value = '';
  control.append(empty);

  if (!date) {
    control.disabled = true;
    control.value = '';
    return;
  }

  const lessonLength = orderContext.course
    ? orderContext.course.week_length
    : Number(orderControls.duration.value) || 1;

  const times = orderContext.course ? courseStartTimes(orderContext.course, date) : TUTOR_TIMES;

  times.forEach(function (value) {
    const option = createElement('option', null, value + ' - ' + addHours(value, lessonLength));
    option.value = value;
    control.append(option);
  });

  control.disabled = false;
  control.value = times.includes(previous) ? previous : '';
}

function collectRequest() {
  const date = orderControls.date.value;
  const time = orderControls.time.value;
  const persons = Number(orderControls.persons.value);

  const weeks = orderContext.course ? orderContext.course.total_length : 1;
  const weekHours = orderContext.course
    ? orderContext.course.week_length
    : Number(orderControls.duration.value);
  const hours = orderContext.course ? courseHours(orderContext.course) : weekHours;
  const feePerHour = orderContext.course
    ? orderContext.course.course_fee_per_hour
    : orderContext.tutor.price_per_hour;

  const options = {};

  OPTIONS.forEach(function (option) {
    options[option.field] = orderControls.checks[option.field].checked;
  });

  return {
    dateStart: date,
    timeStart: time,
    persons: persons,
    weeks: weeks,
    weekHours: weekHours,
    hours: hours,
    feePerHour: feePerHour,
    options: options
  };
}

function updateOrderForm() {
  const request = collectRequest();

  orderControls.checks.early_registration.checked = Boolean(request.dateStart) && isEarlyRegistration(request.dateStart);
  orderControls.checks.group_enrollment.checked = request.persons >= 5;
  orderControls.checks.intensive_course.checked = request.weekHours >= 5;

  request.options.early_registration = orderControls.checks.early_registration.checked;
  request.options.group_enrollment = orderControls.checks.group_enrollment.checked;
  request.options.intensive_course = orderControls.checks.intensive_course.checked;

  if (orderControls.length) {
    const course = orderContext.course;
    orderControls.length.value = request.dateStart
      ? course.total_length + ' нед., последнее занятие ' + formatDate(lastLessonDate(request.dateStart, course.total_length))
      : course.total_length + ' нед., ' + course.week_length + ' ч в неделю';
  }

  orderControls.breakdown.innerHTML = '';

  const ready = request.dateStart && request.timeStart && request.persons >= 1 && request.hours >= 1;

  if (!ready) {
    orderControls.total.textContent = '—';
    return;
  }

  const price = calculatePrice(request);
  orderControls.total.textContent = formatPrice(price.total);

  price.basis.forEach(function (item) {
    orderControls.breakdown.append(createElement('li', null, item.title + ': ' + item.note));
  });

  orderControls.breakdown.append(createElement('li', 'fw-semibold', 'Базовая стоимость: ' + formatPrice(price.base)));

  price.changes.forEach(function (item) {
    const sign = item.amount < 0 ? '−' : '+';
    orderControls.breakdown.append(
      createElement('li', item.amount < 0 ? 'text-success' : null, item.title + ': ' + sign + formatPrice(Math.abs(item.amount)))
    );
  });
}

function buildPayload() {
  const request = collectRequest();
  const price = calculatePrice(request);

  const payload = {
    date_start: request.dateStart,
    time_start: request.timeStart,
    duration: request.hours,
    persons: request.persons,
    price: price.total
  };

  OPTIONS.forEach(function (option) {
    payload[option.field] = request.options[option.field];
  });

  if (orderContext.course) {
    payload.course_id = orderContext.course.id;
  } else {
    payload.tutor_id = orderContext.tutor.id;
  }

  return payload;
}

async function submitOrderForm(event) {
  event.preventDefault();

  const form = event.target;

  if (!form.reportValidity()) {
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    if (orderContext.order) {
      await updateOrder(orderContext.order.id, buildPayload());
    } else {
      await createOrder(buildPayload());
    }
  } catch (error) {
    showNotification('Не удалось сохранить заявку. ' + error.message, 'danger');
    return;
  } finally {
    button.disabled = false;
  }

  orderModal.hide();
  showNotification(orderContext.order ? 'Заявка успешно изменена' : 'Заявка успешно оформлена', 'success');

  if (orderContext.onSave) {
    await orderContext.onSave();
  }
}

function openOrderForm(context) {
  orderContext = context;

  document.querySelector('.order-form__title').textContent = context.order ? 'Редактирование заявки' : 'Оформление заявки';
  document.querySelector('.order-form__submit').textContent = context.order ? 'Сохранить' : 'Отправить';

  buildOrderForm(context);
  fillTimeOptions();

  if (context.order) {
    orderControls.time.value = formatTime(context.order.time_start);
  }

  updateOrderForm();

  orderModal = bootstrap.Modal.getOrCreateInstance(document.querySelector('.order-modal'));
  orderModal.show();
}

const orderForm = document.querySelector('.order-form');

orderForm.addEventListener('change', function (event) {
  if (!orderControls) {
    return;
  }

  if (event.target === orderControls.date || event.target === orderControls.duration) {
    fillTimeOptions();
  }

  updateOrderForm();
});

orderForm.addEventListener('input', function () {
  if (orderControls) {
    updateOrderForm();
  }
});

orderForm.addEventListener('submit', submitOrderForm);
