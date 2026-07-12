import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { settingsApi } from '../../services/settingsApi';
import SettingsSection from '../../components/settings/SettingsSection';
import SettingsInput from '../../components/settings/SettingsInput';
import SettingsToggle from '../../components/settings/SettingsToggle';
import SettingsTabs from '../../components/settings/SettingsTabs';
import CharCounter from '../../components/settings/CharCounter';
import SeoPreview from '../../components/settings/SeoPreview';
import {
  Save, RotateCcw, CheckCircle, AlertTriangle, Store,
  Palette, Receipt, Truck, CreditCard, Settings2,
  Globe, Clock, Wrench, Search,
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'tax', label: 'Tax', icon: Receipt },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'system', label: 'System', icon: Settings2 },
];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Shanghai',
  'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Pacific/Auckland', 'Australia/Sydney',
];

const CURRENCIES = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
];

const AdminSettings = () => {
  const [form, setForm] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const originalRef = useRef({});

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getSettings();
      const data = res.data;
      setForm(data);
      setOriginal(data);
      originalRef.current = data;
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const isDirty = () => {
    const orig = originalRef.current;
    return Object.keys(form).some((key) => form[key] !== orig[key]);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleToggle = (name) => (value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.store_name?.trim()) {
      setError('Store name is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const changed = {};
      for (const key of Object.keys(form)) {
        if (form[key] !== originalRef.current[key]) {
          changed[key] = form[key];
        }
      }
      await settingsApi.updateSettings(changed);
      const res = await settingsApi.getSettings();
      setForm(res.data);
      setOriginal(res.data);
      originalRef.current = res.data;
      showToast('Settings saved successfully');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ ...original });
    setError('');
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your store preferences</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-6">
          <div className="h-8 bg-gray-50 rounded-lg w-48" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg" />
            ))}
          </div>
          <div className="h-8 bg-gray-50 rounded-lg w-48" />
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderGeneralTab = () => (
    <SettingsSection title="General Information" description="Basic store details" icon={Globe}>
      <SettingsInput label="Store Name" name="store_name" value={form.store_name} onChange={handleChange} required />
      <SettingsInput label="Store Email" name="store_email" value={form.store_email} onChange={handleChange} type="email" placeholder="store@example.com" />
      <SettingsInput label="Store Phone" name="store_phone" value={form.store_phone} onChange={handleChange} placeholder="+91 9015957377" />
      <SettingsInput label="Store Address" name="store_address" value={form.store_address} onChange={handleChange} type="textarea" placeholder="Full address" />
    </SettingsSection>
  );

  const renderBrandingTab = () => (
    <SettingsSection title="Branding" description="Logo and favicon URLs" icon={Palette}>
      <SettingsInput label="Logo URL" name="logo_url" value={form.logo_url} onChange={handleChange} placeholder="https://example.com/logo.png" />
      <SettingsInput label="Favicon URL" name="favicon_url" value={form.favicon_url} onChange={handleChange} placeholder="https://example.com/favicon.ico" />
    </SettingsSection>
  );

  const renderSeoTab = () => (
    <SettingsSection title="Default SEO" description="Fallback meta tags for pages without custom SEO" icon={Search}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Default Meta Title <CharCounter current={form.default_meta_title || ''} max={60} />
        </label>
        <input
          type="text"
          name="default_meta_title"
          value={form.default_meta_title || ''}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
          placeholder="e.g. NestinoKids - Premium Kids Fashion"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Default Meta Description <CharCounter current={form.default_meta_description || ''} max={160} />
        </label>
        <textarea
          name="default_meta_description"
          value={form.default_meta_description || ''}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
          placeholder="Shop premium kids clothing and accessories at NestinoKids..."
        />
      </div>
      <SettingsInput
        label="Default Meta Keywords"
        name="default_meta_keywords"
        value={form.default_meta_keywords}
        onChange={handleChange}
        placeholder="kids fashion, children clothing, baby products"
      />
      <SettingsInput
        label="Default OG Image URL"
        name="default_og_image"
        value={form.default_og_image}
        onChange={handleChange}
        placeholder="https://example.com/og-image.jpg"
      />
      <SettingsInput
        label="Canonical URL"
        name="default_canonical_url"
        value={form.default_canonical_url}
        onChange={handleChange}
        placeholder="https://www.nestinokids.com"
      />
      <div className="mt-2">
        <SeoPreview
          title={form.default_meta_title || ''}
          url={form.default_canonical_url || 'nestinokids.com'}
          description={form.default_meta_description || ''}
        />
      </div>
    </SettingsSection>
  );

  const renderTaxTab = () => (
    <SettingsSection title="Tax Configuration" description="GST and tax settings" icon={Receipt}>
      <SettingsInput label="GST Number" name="gst_number" value={form.gst_number} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
      <SettingsToggle
        label="Enable Tax"
        description="Apply tax to all orders"
        enabled={form.tax_enabled}
        onChange={handleToggle('tax_enabled')}
      />
      <SettingsInput
        label="Tax Percentage"
        name="tax_percentage"
        value={form.tax_percentage}
        onChange={handleChange}
        type="number"
        disabled={!form.tax_enabled}
      />
    </SettingsSection>
  );

  const renderShippingTab = () => (
    <SettingsSection title="Free Shipping" description="Configure free shipping thresholds" icon={Truck}>
      <SettingsToggle
        label="Enable Free Shipping"
        description="Offer free shipping on qualifying orders"
        enabled={form.free_shipping_enabled}
        onChange={handleToggle('free_shipping_enabled')}
      />
      <SettingsInput
        label="Minimum Order Amount"
        name="free_shipping_min"
        value={form.free_shipping_min}
        onChange={handleChange}
        type="number"
        disabled={!form.free_shipping_enabled}
      />
    </SettingsSection>
  );

  const renderPaymentsTab = () => (
    <SettingsSection title="Payment Methods" description="Available payment options" icon={CreditCard}>
      <SettingsToggle
        label="Cash on Delivery"
        description="Accept COD payments"
        enabled={form.cod_enabled}
        onChange={handleToggle('cod_enabled')}
      />
      <SettingsToggle
        label="Online Payments"
        description="Accept online payments via gateway"
        enabled={form.online_payment_enabled}
        onChange={handleToggle('online_payment_enabled')}
      />
    </SettingsSection>
  );

  const renderSystemTab = () => (
    <SettingsSection title="System Settings" description="Currency, timezone and maintenance" icon={Settings2}>
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
        <select
          id="currency"
          name="currency"
          value={form.currency}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold bg-white"
        >
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
        <select
          id="timezone"
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold bg-white"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <div>
        <SettingsToggle
          label="Maintenance Mode"
          description="Disable public access to the store"
          enabled={form.maintenance_mode}
          onChange={handleToggle('maintenance_mode')}
        />
        {form.maintenance_mode && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <Wrench size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Maintenance Mode Active</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your store is currently in maintenance mode. Only admin users will be able to access the site.
              </p>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'branding': return renderBrandingTab();
      case 'seo': return renderSeoTab();
      case 'tax': return renderTaxTab();
      case 'shipping': return renderShippingTab();
      case 'payments': return renderPaymentsTab();
      case 'system': return renderSystemTab();
      default: return null;
    }
  };

  const dirty = isDirty();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your store preferences</p>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm shadow-lg ${
              toast.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <SettingsTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6 space-y-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400">
          {dirty && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold" /> Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-5 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
