# DrugStock

**DrugStock** is a local medicine inventory management tool built with Next.js, React, tRPC, Prisma (SQLite), and NextAuth for authentication.

## Features
- Secure, authenticated stock management (add, edit, delete medicines)
- Search and filter by name, group, brand, or active ingredient
- Sortable columns with visual chevrons
- Packs + unit stock model with audit trail (per-pack vs. per-tablet)
- Low-stock and expired-date highlighting
- Interactive pagination and adjustable page size (20, 30, 50, 75, 100)
- Real-time group and overall stock statistics

## Tech Stack
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- tRPC (React + Server)
- Prisma ORM + SQLite (development) / any SQL DB in prod
- NextAuth.js (credentials provider)

## Quick Start
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/drug-stock.git
   cd drug-stock
   ```
2. **Install dependencies**
   ```bash
   npm install    # or yarn
   ```
3. **Configure environment variables**
   Copy the example file and update:
   ```bash
   cp .env.example .env
   ```
   ```env
   # .env
   AUTH_SECRET=your_nextauth_secret_here
   DATABASE_URL="file:./dev.db"
   ```
4. **Setup the database**

   ### Development (with migrations)
   ```bash
   # Create initial migration and apply
   npx prisma migrate dev --name init
   # Generate the Prisma client
   npx prisma generate
   ```

   ### Production (or quick DB sync)
   ```bash
   # Push schema changes without migrations
   npx prisma db push
   # Generate the Prisma client
   npx prisma generate
   ```

   You can also launch **Prisma Studio** to visually inspect/edit data:
   ```bash
   npx prisma studio
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

6. **Access the app**
   - Open http://localhost:3000/ and sign in via the credentials form.

## Usage
- After signing in, navigate to **Stok Yönetimi** to add, edit, delete, and dispense medicines.
- Use the **Yeni İlaç Ekle** form to specify packs and units as needed.
- Filter and search by name, group, brand, or active ingredient.
- Sort columns by clicking headers (with ascending/descending icons).
- Configure how many items per page and navigate pages.

## Environment Variables
| Name           | Description                                  | Required |
|----------------|----------------------------------------------|----------|
| AUTH_SECRET    | Secret for NextAuth.js session signing       | Yes      |
| DATABASE_URL   | Connection string for Prisma (SQLite file)   | Yes      |

## Contributing
1. Fork the repo and create a feature branch.
2. Write code, run lint/tests.
3. Open a pull request describing your changes.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
