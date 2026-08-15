/**
 * Sample Data Generator Tool Island
 * Generate realistic sample data (JSON, CSV, SQL INSERT) with configurable count
 */

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'example.org', 'test.io', 'sample.net'];

import { icon } from "../../utils/icons.ts";

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateDate() {
  const year = rand(1960, 2005);
  const month = String(rand(1, 12)).padStart(2, '0');
  const day = String(rand(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateEmail(first, last) {
  const domain = randItem(DOMAINS);
  const formats = [
    `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    `${first.toLowerCase()}${last.toLowerCase()}@${domain}`,
    `${first.charAt(0).toLowerCase()}${last.toLowerCase()}@${domain}`,
    `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@${domain}`,
  ];
  return randItem(formats);
}

function generatePhone() {
  return `+1 (${rand(200, 999)}) ${rand(200, 999)}-${rand(1000, 9999)}`;
}

function generateAvatarUrl(id) {
  // Local placeholder only — generated mock data must never reference
  // external services (privacy promise: zero external requests). Users
  // swap these for their own asset URLs in real pipelines.
  return `avatar_${id}.png`;
}

function generateRecord(index) {
  const id = generateId();
  const first = randItem(FIRST_NAMES);
  const last = randItem(LAST_NAMES);
  const name = `${first} ${last}`;
  return {
    id,
    name,
    firstName: first,
    lastName: last,
    email: generateEmail(first, last),
    phone: generatePhone(),
    age: rand(18, 80),
    dateOfBirth: generateDate(),
    gender: randItem(['Male', 'Female', 'Non-binary']),
    address: {
      street: `${rand(100, 9999)} ${randItem(['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Main', 'Park', 'Washington', 'Lake', 'Hill'])} ${randItem(['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Ln'])}`,
      city: randItem(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']),
      state: randItem(['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']),
      zipCode: String(rand(10000, 99999)),
    },
    company: randItem(['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems']),
    salary: rand(30000, 250000),
    isActive: Math.random() > 0.3,
    createdAt: generateDate(),
    avatar: generateAvatarUrl(id),
  };
}

function escapeCsvField(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function recordToCsv(record) {
  return [
    escapeCsvField(record.id),
    escapeCsvField(record.name),
    escapeCsvField(record.firstName),
    escapeCsvField(record.lastName),
    escapeCsvField(record.email),
    escapeCsvField(record.phone),
    escapeCsvField(record.age),
    escapeCsvField(record.dateOfBirth),
    escapeCsvField(record.gender),
    escapeCsvField(record.address.street),
    escapeCsvField(record.address.city),
    escapeCsvField(record.address.state),
    escapeCsvField(record.address.zipCode),
    escapeCsvField(record.company),
    escapeCsvField(record.salary),
    escapeCsvField(record.isActive),
    escapeCsvField(record.createdAt),
  ].join(',');
}

function recordToSql(record) {
  const esc = (val) => String(val).replace(/'/g, "''");
  const cols = [
    `id`,
    `name`,
    `first_name`,
    `last_name`,
    `email`,
    `phone`,
    `age`,
    `date_of_birth`,
    `gender`,
    `street`,
    `city`,
    `state`,
    `zip_code`,
    `company`,
    `salary`,
    `is_active`,
    `created_at`,
  ];
  const vals = [
    `'${esc(record.id)}'`,
    `'${esc(record.name)}'`,
    `'${esc(record.firstName)}'`,
    `'${esc(record.lastName)}'`,
    `'${esc(record.email)}'`,
    `'${esc(record.phone)}'`,
    record.age,
    `'${esc(record.dateOfBirth)}'`,
    `'${esc(record.gender)}'`,
    `'${esc(record.address.street)}'`,
    `'${esc(record.address.city)}'`,
    `'${esc(record.address.state)}'`,
    `'${esc(record.address.zipCode)}'`,
    `'${esc(record.company)}'`,
    record.salary,
    record.isActive ? 'TRUE' : 'FALSE',
    `'${esc(record.createdAt)}'`,
  ];
  return `INSERT INTO users (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
}

export class SampleDataGenerator {
  constructor(element) {
    this.element = element;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.element.innerHTML = `
      <div class="space-y-4">
        <!-- Controls -->
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label for="sample-count" class="dt-label mb-1.5 block">Count</label>
            <input id="sample-count" type="number" min="1" max="1000" value="10" class="dt-field w-28!" />
          </div>
          <div>
            <label for="sample-format" class="dt-label mb-1.5 block">Format</label>
            <select id="sample-format" class="dt-field w-32!">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          <button id="sample-generate-btn" type="button" class="dt-btn dt-btn-primary">Generate</button>
        </div>

        <!-- Output -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="dt-label">Generated Data</label>
            <button id="sample-copy-btn" type="button" class="dt-btn dt-btn-sm">Copy</button>
          </div>
          <textarea id="sample-output" readonly class="dt-field h-96" placeholder="Click Generate to create sample data..."></textarea>
        </div>

        <!-- Info -->
        <div class="dt-box dt-box-info items-start!">
          <span class="dt-accent">${icon('database', 18)}</span>
          <div>
            <h3 class="mb-1 text-sm font-medium">Sample Data Fields</h3>
            <p class="text-[13px] dt-text-2">Each record includes: id, name, firstName, lastName, email, phone, age, dateOfBirth, gender, address (street, city, state, zipCode), company, salary, isActive, createdAt, avatar</p>
          </div>
        </div>
      </div>
    `;

    // DOM refs
    this.countInput = this.element.querySelector('#sample-count');
    this.formatSelect = this.element.querySelector('#sample-format');
    this.output = this.element.querySelector('#sample-output');
    this.copyBtn = this.element.querySelector('#sample-copy-btn');
    this.generatedData = '';
  }

  bindEvents() {
    this.element.querySelector('#sample-generate-btn').addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());

    // Enter to generate
    this.countInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.generate();
    });
  }

  generate() {
    const count = Math.min(Math.max(parseInt(this.countInput.value) || 1, 1), 1000);
    this.countInput.value = count;
    const format = this.formatSelect.value;

    const records = [];
    for (let i = 0; i < count; i++) {
      records.push(generateRecord(i));
    }

    if (format === 'json') {
      this.generatedData = JSON.stringify(records, null, 2);
    } else if (format === 'csv') {
      const header = 'id,name,firstName,lastName,email,phone,age,dateOfBirth,gender,street,city,state,zipCode,company,salary,isActive,createdAt';
      const rows = records.map(recordToCsv);
      this.generatedData = [header, ...rows].join('\n');
    } else if (format === 'sql') {
      const schema = `-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  age INTEGER,
  date_of_birth DATE,
  gender VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  company VARCHAR(255),
  salary INTEGER,
  is_active BOOLEAN,
  created_at DATE
);

`;
      const inserts = records.map(recordToSql);
      this.generatedData = schema + inserts.join('\n') + '\n';
    }

    this.output.value = this.generatedData;
  }

  async copy() {
    if (!this.generatedData) return;
    try {
      await navigator.clipboard.writeText(this.generatedData);
      const original = this.copyBtn.textContent;
      this.copyBtn.textContent = 'Copied!';
      setTimeout(() => { this.copyBtn.textContent = original; }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  destroy() {}
}
