import React from 'react';
import { Modal } from 'antd';
import { useLanguage, localized, localizedList } from '../../i18n/LanguageContext';
export default function EditionPreview({ open, onClose, form }) {
  const { lang } = useLanguage(),
    sw = lang === 'sw';
  const L = (obj, key) => localized(obj, key, lang);
  const control = (field) => {
    const options = localizedList(field, 'options', lang),
      rows = localizedList(field, 'rows', lang);
    if (['photo_upload', 'photo_group'].includes(field.type))
      return (
        <div className="preview-photo">
          {sw
            ? 'Uteuzi wa picha utaonekana hapa. Hakuna faili zinazopakiwa kwenye hakikisho.'
            : 'Photo selection appears here. No files are uploaded in preview.'}
        </div>
      );
    if (field.type === 'textarea') return <textarea rows="3" aria-label={L(field, 'label')} />;
    if (field.type === 'dropdown')
      return (
        <select aria-label={L(field, 'label')}>
          <option>{sw ? 'Chagua' : 'Choose an option'}</option>
          {options.map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      );
    if (['radio', 'checkbox'].includes(field.type))
      return (
        <div className="preview-options">
          {options.map((o, i) => (
            <label key={i}>
              <input type={field.type === 'radio' ? 'radio' : 'checkbox'} name={field.fieldId} />
              {o}
            </label>
          ))}
        </div>
      );
    if (['grid_radio', 'grid_checkbox'].includes(field.type))
      return (
        <div className="preview-grid-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{sw ? 'Swali' : 'Question'}</th>
                {options.map((o, i) => (
                  <th key={i}>{o}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <th>{row}</th>
                  {options.map((o, j) => (
                    <td key={j}>
                      <input
                        aria-label={`${row}: ${o}`}
                        type={field.type === 'grid_radio' ? 'radio' : 'checkbox'}
                        name={`${field.fieldId}-${i}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    if (['linear_scale', 'rating'].includes(field.type)) {
      const low = field.type === 'rating' ? 1 : (field.scaleConfig?.low ?? 1),
        high = field.type === 'rating' ? (field.ratingConfig?.levelCount ?? 5) : (field.scaleConfig?.high ?? 5);
      return (
        <div className="preview-options">
          {Array.from({ length: Math.min(20, high - low + 1) }, (_, i) => (
            <label key={i}>
              <input type="radio" name={field.fieldId} />
              {i + low}
            </label>
          ))}
        </div>
      );
    }
    return (
      <input
        aria-label={L(field, 'label')}
        type={
          field.type === 'datetime'
            ? 'datetime-local'
            : ['date', 'time', 'number'].includes(field.type)
              ? field.type
              : 'text'
        }
      />
    );
  };
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={sw ? 'Hakikisho la toleo' : 'Edition preview'}
      footer={null}
      width={820}
      destroyOnHidden
    >
      <div className="edition-preview">
        <p className="ui-description">
          {sw
            ? 'Hakikisho hili haliweki oda wala kuhifadhi majibu.'
            : 'This preview does not place an order or save answers.'}
        </p>
        <h1 className="ui-title">{L(form, 'title') || '—'}</h1>
        <p>{L(form, 'description')}</p>
        <p className="ui-badge">
          {form.price?.toLocaleString()} {form.currency}
        </p>
        <fieldset key={open ? 'open' : 'closed'} disabled>
          {(form.sections?.length
            ? form.sections
            : [{ sectionId: 'default', title: sw ? 'Maswali' : 'Questions' }]
          ).map((section) => (
            <section className="ui-card" key={section.sectionId}>
              <h2>{L(section, 'title')}</h2>
              <p>{L(section, 'description')}</p>
              {form.fields
                .filter((field) => field.sectionId === section.sectionId || section.sectionId === 'default')
                .map((field) => (
                  <div className="ui-field" key={field.fieldId}>
                    <strong>
                      {L(field, 'label')}
                      {field.required ? ' *' : ''}
                    </strong>
                    <small>{L(field, 'helperText')}</small>
                    {control(field)}
                  </div>
                ))}
            </section>
          ))}
        </fieldset>
      </div>
    </Modal>
  );
}
