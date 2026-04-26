This is the Next.js frontend for the LMS system.

## Getting Started

1. Install frontend dependencies:

```bash
npm install
```

2. Install backend dependencies (from the repository root, using the same Python executable you will run the server with):

```bash
python3 -m pip install -r requirements.txt
```

3. Start the Django backend from the repository root:

```bash
python3 manage.py runserver
```

4. (Optional) if your backend is not running on `http://127.0.0.1:8000`, set a custom backend URL:

```bash
DJANGO_BACKEND_URL=http://127.0.0.1:8001
```

5. Run the frontend development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
