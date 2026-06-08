import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Mail, Phone, MapPin, Camera, Play, MessageSquare } from 'lucide-react';
import { adminAPI, settingsAPI } from '../../api/endpoints';

const URL_REGEX = /^https?:\/\/.+/i;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

const WebsiteSettings = () => {
  const [form, setForm] = useState({
    site_name: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    whatsapp_number: '',
    support_email: '',
    support_phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getSettings();
      setForm(res.data);
    } catch {
      try {
        const res = await settingsAPI.getPublic();
        setForm(res.data);
      } catch {
        showToast('Failed to load settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const urlFields = ['instagram_url', 'facebook_url', 'youtube_url'];
    for (const field of urlFields) {
      if (form[field] && !URL_REGEX.test(form[field])) {
        showToast(`Invalid URL format for ${field.replace('_', ' ')}`, 'error');
        return false;
      }
    }
    if (form.whatsapp_number && !PHONE_REGEX.test(form.whatsapp_number)) {
      showToast('Invalid WhatsApp number format', 'error');
      return false;
    }
    if (form.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.support_email)) {
      showToast('Invalid email format', 'error');
      return false;
    }
    if (form.support_phone && !PHONE_REGEX.test(form.support_phone)) {
      showToast('Invalid phone number format', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await adminAPI.updateSettings(form);
      setForm(res.data);
      showToast('Settings saved successfully');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'site_name', label: 'Site Name', icon: Globe, placeholder: 'NestinoKids', section: 'Business' },
    { key: 'support_email', label: 'Support Email', icon: Mail, placeholder: 'support@nestinokids.com', type: 'email', section: 'Business' },
    { key: 'support_phone', label: 'Support Phone', icon: Phone, placeholder: '9015957377', section: 'Business' },
    { key: 'address', label: 'Address', icon: MapPin, placeholder: 'F-3/339 Street No., Sangam Vihar, New Delhi 110080', section: 'Business', textarea: true },
    { key: 'instagram_url', label: 'Instagram URL', icon: Camera, placeholder: 'https://instagram.com/nestinokids', section: 'Social' },
    { key: 'facebook_url', label: 'Facebook URL', icon: Globe, placeholder: 'https://facebook.com/nestinokids', section: 'Social' },
    { key: 'youtube_url', label: 'YouTube URL', icon: Play, placeholder: 'https://youtube.com/@nestinokids', section: 'Social' },
    { key: 'whatsapp_number', label: 'WhatsApp Number', icon: MessageSquare, placeholder: '+919015957377', section: 'Social' },
  ];

  const businessFields = fields.filter((f) => f.section === 'Business');
  const socialFields = fields.filter((f) => f.section === 'Social');

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-text outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/30 transition-all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-text">Website Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your site-wide business information and social links</p>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 px-5 py-3 rounded-xl text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <div className="bg-white rounded-2xl border border-gray-50 shadow-card p-6 lg:p-8">
          <h2 className="text-base font-bold text-text mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gold" />
            Business Information
          </h2>
          <div className="space-y-5">
            {businessFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {field.textarea ? (
                    <textarea
                      value={form[field.key]}
                      onChange={handleChange(field.key)}
                      placeholder={field.placeholder}
                      rows={3}
                      className={`${inputClass} pl-10 resize-y`}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key]}
                      onChange={handleChange(field.key)}
                      placeholder={field.placeholder}
                      className={`${inputClass} pl-10`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl border border-gray-50 shadow-card p-6 lg:p-8">
          <h2 className="text-base font-bold text-text mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold" />
            Social Links
          </h2>
          <div className="space-y-5">
            {socialFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={handleChange(field.key)}
                    placeholder={field.placeholder}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.98 }}
            className="h-11 px-8 bg-gold text-white rounded-xl font-semibold text-sm shadow-premium hover:bg-gold-dark transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteSettings;
