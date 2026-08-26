const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const quickRepliesRoutes = require('./routes/quickReplies');
const packagesRoutes = require('./routes/packages');
const analyticsRoutes = require('./routes/analytics');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const packageFilesRoutes = require('./routes/packageFiles');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/quick-replies', quickRepliesRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/package-files', packageFilesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
