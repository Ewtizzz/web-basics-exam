const PAGE_SIZE = 5;
const NOTIFICATION_TIMEOUT = 5000;
const TUTOR_PHOTO = 'images/tutor.svg';

const LEVELS = {
  Beginner: 'Начальный',
  Intermediate: 'Средний',
  Advanced: 'Продвинутый'
};

const LANGUAGES = {
  Russian: 'Русский',
  English: 'Английский',
  Spanish: 'Испанский',
  French: 'Французский',
  German: 'Немецкий',
  Italian: 'Итальянский',
  Japanese: 'Японский',
  Chinese: 'Китайский'
};

const LANGUAGE_KEYWORDS = [
  { language: 'Russian', words: ['Russian'] },
  { language: 'Spanish', words: ['Spanish'] },
  { language: 'French', words: ['French'] },
  { language: 'German', words: ['German'] },
  { language: 'Italian', words: ['Italian'] },
  { language: 'Japanese', words: ['Japanese'] },
  { language: 'Chinese', words: ['Chinese', 'Mandarin'] },
  { language: 'English', words: ['English', 'IELTS', 'TOEFL'] }
];

const HOLIDAYS = [
  '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08',
  '02-23', '03-08', '05-01', '05-09', '06-12', '11-04'
];

const OPTIONS = [
  {
    field: 'early_registration',
    title: 'Ранняя регистрация',
    note: 'Заявка не менее чем за месяц до начала — скидка 10%',
    automatic: true
  },
  {
    field: 'group_enrollment',
    title: 'Групповая запись',
    note: 'Группа от 5 человек — скидка 15%',
    automatic: true
  },
  {
    field: 'intensive_course',
    title: 'Интенсивный курс',
    note: 'От 5 часов занятий в неделю — надбавка 20%',
    automatic: true
  },
  {
    field: 'excursions',
    title: 'Культурные экскурсии',
    note: 'Надбавка 25% к стоимости',
    automatic: false
  },
  {
    field: 'interactive',
    title: 'Интерактивная онлайн-платформа',
    note: 'Надбавка 50% к стоимости',
    automatic: false
  },
  {
    field: 'supplementary',
    title: 'Дополнительные учебные материалы',
    note: '2000 ₽ за каждого студента',
    automatic: false
  },
  {
    field: 'personalized',
    title: 'Индивидуальные занятия',
    note: '1500 ₽ за каждую неделю курса',
    automatic: false
  },
  {
    field: 'assessment',
    title: 'Оценка уровня владения языком',
    note: '300 ₽ за заявку',
    automatic: false
  }
];

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  return element;
}

function levelName(level) {
  return LEVELS[level] || level;
}

function languageName(language) {
  return LANGUAGES[language] || language;
}

function languageList(languages) {
  return languages.map(languageName).join(', ');
}

function detectCourseLanguage(course) {
  const text = course.name + ' ' + course.description;

  const found = LANGUAGE_KEYWORDS.find(function (item) {
    return item.words.some(function (word) {
      return text.toLowerCase().includes(word.toLowerCase());
    });
  });

  return found ? found.language : null;
}

function courseHours(course) {
  return course.total_length * course.week_length;
}

function courseStartDates(course) {
  const dates = course.start_dates.map(function (value) {
    return value.slice(0, 10);
  });

  return Array.from(new Set(dates)).sort();
}

function courseStartTimes(course, date) {
  const times = course.start_dates
    .filter(function (value) {
      return value.slice(0, 10) === date;
    })
    .map(function (value) {
      return value.slice(11, 16);
    });

  return Array.from(new Set(times)).sort();
}

function formatPrice(value) {
  return value.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(value) {
  const parts = value.slice(0, 10).split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function formatTime(value) {
  return value.slice(0, 5);
}

function toDate(value) {
  return new Date(value.slice(0, 10) + 'T00:00:00');
}

function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function addWeeks(dateString, weeks) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + weeks * 7);
  return toDateString(date);
}

function addHours(timeString, hours) {
  const start = Number(timeString.slice(0, 2));
  const minutes = timeString.slice(3, 5);
  return String((start + hours) % 24).padStart(2, '0') + ':' + minutes;
}

function lastLessonDate(dateString, weeks) {
  return addWeeks(dateString, weeks - 1);
}

function isWeekendOrHoliday(dateString) {
  const date = toDate(dateString);
  const day = date.getDay();
  return day === 0 || day === 6 || HOLIDAYS.includes(toDateString(date).slice(5));
}

function isEarlyRegistration(dateString) {
  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setMonth(limit.getMonth() + 1);
  return toDate(dateString) >= limit;
}

function calculatePrice(request) {
  const weekendRate = isWeekendOrHoliday(request.dateStart) ? 1.5 : 1;
  const hour = Number(request.timeStart.slice(0, 2));
  const morningSurcharge = hour >= 9 && hour < 12 ? 400 : 0;
  const eveningSurcharge = hour >= 18 && hour < 20 ? 1000 : 0;

  const base = Math.round(
    (request.feePerHour * request.hours * weekendRate + morningSurcharge + eveningSurcharge) * request.persons
  );

  const basis = [
    {
      title: 'Стоимость занятий',
      note: formatPrice(request.feePerHour) + '/ч × ' + request.hours + ' ч × ' + request.persons + ' чел.'
    }
  ];

  if (weekendRate > 1) {
    basis.push({ title: 'Занятия в выходной или праздничный день', note: 'коэффициент 1,5' });
  }

  if (morningSurcharge > 0) {
    basis.push({ title: 'Доплата за утренние занятия', note: formatPrice(morningSurcharge) + ' за студента' });
  }

  if (eveningSurcharge > 0) {
    basis.push({ title: 'Доплата за вечерние занятия', note: formatPrice(eveningSurcharge) + ' за студента' });
  }

  const changes = [];
  let total = base;

  function applyRate(field, title, rate) {
    if (!request.options[field]) {
      return;
    }

    const amount = Math.round(total * rate) - total;
    total += amount;
    changes.push({ title: title, amount: amount });
  }

  function applySum(field, title, amount) {
    if (!request.options[field]) {
      return;
    }

    total += amount;
    changes.push({ title: title, amount: amount });
  }

  applyRate('early_registration', 'Скидка за раннюю регистрацию (10%)', 0.9);
  applyRate('group_enrollment', 'Скидка за групповую запись (15%)', 0.85);
  applyRate('intensive_course', 'Интенсивный курс (20%)', 1.2);
  applyRate('excursions', 'Культурные экскурсии (25%)', 1.25);
  applyRate('interactive', 'Интерактивная онлайн-платформа (50%)', 1.5);
  applySum('supplementary', 'Дополнительные учебные материалы', 2000 * request.persons);
  applySum('personalized', 'Индивидуальные занятия', 1500 * request.weeks);
  applySum('assessment', 'Оценка уровня владения языком', 300);

  return { base: base, basis: basis, changes: changes, total: total };
}

function showNotification(message, type) {
  const area = document.querySelector('.notifications');

  const alert = createElement('div', 'alert alert-' + type + ' alert-dismissible fade show');
  alert.setAttribute('role', 'alert');
  alert.append(createElement('span', null, message));

  const close = createElement('button', 'btn-close');
  close.type = 'button';
  close.dataset.bsDismiss = 'alert';
  close.setAttribute('aria-label', 'Закрыть');
  alert.append(close);

  area.append(alert);
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  setTimeout(function () {
    bootstrap.Alert.getOrCreateInstance(alert).close();
  }, NOTIFICATION_TIMEOUT);
}

function pageCount(total) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function pageItems(items, page) {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function renderPagination(list, page, pages, onSelect) {
  list.innerHTML = '';

  if (pages < 2) {
    return;
  }

  function addItem(text, target, disabled, active) {
    const item = createElement('li', 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : ''));
    const link = createElement('a', 'page-link', text);
    link.href = '#';

    if (active) {
      link.setAttribute('aria-current', 'page');
    }

    link.addEventListener('click', function (event) {
      event.preventDefault();

      if (!disabled && !active) {
        onSelect(target);
      }
    });

    item.append(link);
    list.append(item);
  }

  addItem('Назад', page - 1, page === 1, false);

  for (let number = 1; number <= pages; number++) {
    addItem(String(number), number, false, number === page);
  }

  addItem('Вперёд', page + 1, page === pages, false);
}

function initTooltips(container) {
  container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
    bootstrap.Tooltip.getOrCreateInstance(element);
  });
}
