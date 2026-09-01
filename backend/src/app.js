const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const quickRepliesRoutes = require('./routes/quickReplies');
const packagesRoutes = require('./routes/packages');
const analyticsRoutes = require('./routes/analytics');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const packageFilesRoutes = require('./routes/packageFiles');
const followupTemplatesRoutes = require('./routes/followupTemplates');
const activityRoutes = require('./routes/activity');
const leadsRoutes = require('./routes/leads');
const rolesRoutes = require('./routes/roles');
const departuresRoutes = require('./routes/departures');
const bookingsRoutes = require('./routes/bookings');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Tanpa CORS_ORIGIN, API terbuka untuk semua situs. Token disimpan di
// localStorage dan tidak ikut terkirim otomatis lintas situs, jadi dampaknya
// terbatas — tapi tidak ada alasan membiarkannya terbuka.
if (!process.env.CORS_ORIGIN) {
  console.warn('[PERINGATAN] CORS_ORIGIN belum diisi — API menerima permintaan dari semua asal.');
}
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
app.use('/api/followup-templates', followupTemplatesRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/departures', departuresRoutes);
app.use('/api/bookings', bookingsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
