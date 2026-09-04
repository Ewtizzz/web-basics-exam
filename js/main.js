let courses = [];
let tutors = [];
let coursePage = 1;
let selectedCourse = null;
let selectedTutor = null;

const courseSearch = document.querySelector('.courses-search');
const coursesBody = document.querySelector('.courses-body');
const coursesEmpty = document.querySelector('.courses-empty');
const coursesPagination = document.querySelector('.courses-pagination');
const courseDetails = document.querySelector('.course-details');
const courseOrderButton = document.querySelector('.course-order');
const courseHint = document.querySelector('.course-hint');

const tutorSearch = document.querySelector('.tutors-search');
const tutorsBody = document.querySelector('.tutors-body');
const tutorsEmpty = document.querySelector('.tutors-empty');
const tutorsNote = document.querySelector('.tutors-note');
const tutorOrderButton = document.querySelector('.tutor-order');
const tutorHint = document.querySelector('.tutor-hint');

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

function filterCourses() {
  const name = courseSearch.elements.name.value.trim().toLowerCase();
  const level = courseSearch.elements.level.value;

  return courses.filter(function (course) {
    const matchesName = !name || course.name.toLowerCase().includes(name);
    const matchesLevel = !level || course.level === level;
    return matchesName && matchesLevel;
  });
}

function filterTutors() {
  const language = tutorSearch.elements.language.value;
  const level = tutorSearch.elements.level.value;
  const experience = Number(tutorSearch.elements.experience.value);

  return tutors.filter(function (tutor) {
    const matchesLanguage = !language || tutor.languages_offered.includes(language);
    const matchesLevel = !level || tutor.language_level === level;
    const matchesExperience = !tutorSearch.elements.experience.value || tutor.work_experience >= experience;
    return matchesLanguage && matchesLevel && matchesExperience;
  });
}

function createDescriptionCell(course) {
  const cell = createElement('td');
  const name = createElement('p', 'fw-semibold mb-1', course.name);

  const description = createElement('p', 'description-cell text-secondary small mb-0', course.description);
  description.dataset.bsToggle = 'tooltip';
  description.dataset.bsTitle = course.description;

  cell.append(name, description);
  return cell;
}

function createCourseRow(course) {
  const row = createElement('tr', 'selectable-row');
  row.dataset.course = String(course.id);

  if (selectedCourse && selectedCourse.id === course.id) {
    row.classList.add('table-selected');
  }

  row.append(createDescriptionCell(course));
  row.append(createElement('td', null, levelName(course.level)));
  row.append(createElement('td', null, course.teacher));
  row.append(createElement('td', null, course.total_length + ' нед. по ' + course.week_length + ' ч'));
  row.append(createElement('td', null, formatPrice(course.course_fee_per_hour) + '/ч'));

  const actions = createElement('td', 'text-end');
  const button = createElement('button', 'btn btn-sm btn-primary text-nowrap', 'Подать заявку');
  button.type = 'button';
  button.dataset.action = 'order';
  actions.append(button);
  row.append(actions);

  return row;
}

function renderCourses() {
  const found = filterCourses();
  const pages = pageCount(found.length);

  if (coursePage > pages) {
    coursePage = pages;
  }

  coursesBody.innerHTML = '';

  pageItems(found, coursePage).forEach(function (course) {
    coursesBody.append(createCourseRow(course));
  });

  coursesEmpty.classList.toggle('d-none', found.length > 0);
  renderPagination(coursesPagination, coursePage, pages, function (page) {
    coursePage = page;
    renderCourses();
  });

  initTooltips(coursesBody);
}

function createSummaryItem(list, title, value) {
  list.append(createElement('dt', 'col-sm-4 fw-semibold', title));
  list.append(createElement('dd', 'col-sm-8', value));
}

function renderCourseDetails() {
  const body = courseDetails.querySelector('.card-body');
  body.innerHTML = '';

  if (!selectedCourse) {
    courseDetails.classList.add('d-none');
    return;
  }

  const course = selectedCourse;
  const language = detectCourseLanguage(course);

  body.append(createElement('h3', 'h4 fw-bold mb-2', course.name));

  const badges = createElement('p', 'mb-3');
  badges.append(createElement('span', 'badge text-bg-primary me-2', levelName(course.level)));

  if (language) {
    badges.append(createElement('span', 'badge text-bg-secondary', languageName(language) + ' язык'));
  }

  body.append(badges);
  body.append(createElement('p', 'text-secondary', course.description));

  const list = createElement('dl', 'row mb-0');
  createSummaryItem(list, 'Преподаватель', course.teacher);
  createSummaryItem(list, 'Продолжительность', course.total_length + ' недель, ' + course.week_length + ' ч в неделю, всего ' + courseHours(course) + ' ч');
  createSummaryItem(list, 'Стоимость занятий', formatPrice(course.course_fee_per_hour) + ' за час обучения');
  createSummaryItem(list, 'Даты начала', courseStartDates(course).map(formatDate).join(', '));
  body.append(list);

  courseDetails.classList.remove('d-none');
}

function selectCourse(course) {
  selectedCourse = course;

  coursesBody.querySelectorAll('tr').forEach(function (row) {
    row.classList.toggle('table-selected', Number(row.dataset.course) === course.id);
  });

  courseOrderButton.disabled = false;
  courseHint.textContent = 'Выбран курс «' + course.name + '»';

  renderCourseDetails();

  const language = detectCourseLanguage(course);

  if (language) {
    tutorSearch.elements.language.value = language;
    tutorsNote.textContent = 'Показаны репетиторы, которые преподают ' +
      languageName(language).toLowerCase() + ' язык - под курс «' + course.name + '».';
  } else {
    tutorSearch.elements.language.value = '';
    tutorsNote.textContent = 'Показаны все репетиторы школы.';
  }

  renderTutors();
}

function createTutorRow(tutor) {
  const row = createElement('tr', 'selectable-row');
  row.dataset.tutor = String(tutor.id);

  if (selectedTutor && selectedTutor.id === tutor.id) {
    row.classList.add('table-selected');
  }

  const photoCell = createElement('td');
  const photo = createElement('img', 'tutor-photo rounded-circle');
  photo.src = TUTOR_PHOTO;
  photo.width = 56;
  photo.height = 56;
  photo.alt = 'Фотография репетитора ' + tutor.name;
  photoCell.append(photo);
  row.append(photoCell);

  row.append(createElement('td', 'fw-semibold', tutor.name));
  row.append(createElement('td', null, levelName(tutor.language_level)));
  row.append(createElement('td', null, languageList(tutor.languages_offered)));
  row.append(createElement('td', 'text-secondary small', languageList(tutor.languages_spoken)));
  row.append(createElement('td', null, tutor.work_experience + ' лет'));
  row.append(createElement('td', null, formatPrice(tutor.price_per_hour) + '/ч'));

  const actions = createElement('td', 'text-end');
  const button = createElement('button', 'btn btn-sm btn-outline-primary text-nowrap', 'Выбрать');
  button.type = 'button';
  button.dataset.action = 'select';
  actions.append(button);
  row.append(actions);

  return row;
}

function renderTutors() {
  const found = filterTutors();

  tutorsBody.innerHTML = '';

  found.forEach(function (tutor) {
    tutorsBody.append(createTutorRow(tutor));
  });

  tutorsEmpty.classList.toggle('d-none', found.length > 0);
}

function selectTutor(tutor) {
  selectedTutor = tutor;

  tutorsBody.querySelectorAll('tr').forEach(function (row) {
    row.classList.toggle('table-selected', Number(row.dataset.tutor) === tutor.id);
  });

  tutorOrderButton.disabled = false;
  tutorHint.textContent = 'Выбран репетитор ' + tutor.name;
}

function fillLanguageOptions() {
  const control = tutorSearch.elements.language;

  const offered = tutors.reduce(function (list, tutor) {
    return list.concat(tutor.languages_offered);
  }, []);

  const fromCourses = courses.map(detectCourseLanguage).filter(Boolean);

  Array.from(new Set(offered.concat(fromCourses))).sort().forEach(function (language) {
    const option = createElement('option', null, languageName(language));
    option.value = language;
    control.append(option);
  });
}

courseSearch.addEventListener('input', function () {
  coursePage = 1;
  renderCourses();
});

courseSearch.addEventListener('change', function () {
  coursePage = 1;
  renderCourses();
});

courseSearch.addEventListener('submit', function (event) {
  event.preventDefault();
  coursePage = 1;
  renderCourses();
});

courseSearch.addEventListener('reset', function () {
  setTimeout(function () {
    coursePage = 1;
    renderCourses();
  });
});

tutorSearch.addEventListener('input', renderTutors);
tutorSearch.addEventListener('change', renderTutors);

tutorSearch.addEventListener('submit', function (event) {
  event.preventDefault();
  renderTutors();
});

tutorSearch.addEventListener('reset', function () {
  setTimeout(function () {
    tutorsNote.textContent = 'Показаны все репетиторы школы.';
    renderTutors();
  });
});

coursesBody.addEventListener('click', function (event) {
  const row = event.target.closest('tr');

  if (!row) {
    return;
  }

  const course = findCourse(Number(row.dataset.course));
  selectCourse(course);

  if (event.target.dataset.action === 'order') {
    openOrderForm({ course: course });
  }
});

tutorsBody.addEventListener('click', function (event) {
  const row = event.target.closest('tr');

  if (row) {
    selectTutor(findTutor(Number(row.dataset.tutor)));
  }
});

courseOrderButton.addEventListener('click', function () {
  openOrderForm({ course: selectedCourse });
});

tutorOrderButton.addEventListener('click', function () {
  openOrderForm({ tutor: selectedTutor });
});

document.addEventListener('DOMContentLoaded', async function () {
  try {
    courses = await getCourses();
    tutors = await getTutors();
  } catch (error) {
    showNotification('Не удалось загрузить данные школы. ' + error.message, 'danger');
    return;
  }

  fillLanguageOptions();
  renderCourses();
  renderTutors();
});
