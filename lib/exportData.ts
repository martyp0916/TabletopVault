/**
 * Export Data Utilities
 *
 * Functions to export collection data to CSV and PDF formats.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Collection, Item, getEffectiveStatus, STATUS_LABELS } from '@/types/database';

export interface ExportCollection extends Collection {
  items: Item[];
}

/**
 * Generate CSV content from collections and items
 */
export function generateCSV(collections: ExportCollection[]): string {
  const headers = [
    'Collection',
    'Collection Description',
    'Item Name',
    'Faction',
    'Status',
    'New in Box',
    'Assembled',
    'Primed',
    'Painted',
    'Total Models',
    'Notes',
    'Date Added',
  ];

  const rows: string[][] = [headers];

  collections.forEach((collection) => {
    if (collection.items.length === 0) {
      // Include empty collections
      rows.push([
        escapeCSV(collection.name),
        escapeCSV(collection.description || ''),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    } else {
      collection.items.forEach((item) => {
        const totalModels =
          (item.nib_count || 0) +
          (item.assembled_count || 0) +
          (item.primed_count || 0) +
          (item.painted_count || 0);

        rows.push([
          escapeCSV(collection.name),
          escapeCSV(collection.description || ''),
          escapeCSV(item.name),
          escapeCSV(item.faction || ''),
          STATUS_LABELS[getEffectiveStatus(item)],
          String(item.nib_count || 0),
          String(item.assembled_count || 0),
          String(item.primed_count || 0),
          String(item.painted_count || 0),
          String(totalModels),
          escapeCSV(item.notes || ''),
          new Date(item.created_at).toLocaleDateString(),
        ]);
      });
    }
  });

  return rows.map((row) => row.join(',')).join('\n');
}

/**
 * Escape CSV field values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate HTML content for PDF export
 */
export function generatePDFHTML(collections: ExportCollection[], title: string): string {
  const totalItems = collections.reduce((sum, c) => sum + c.items.length, 0);
  const totalModels = collections.reduce((sum, c) => {
    return sum + c.items.reduce((itemSum, item) => {
      return itemSum +
        (item.nib_count || 0) +
        (item.assembled_count || 0) +
        (item.primed_count || 0) +
        (item.painted_count || 0);
    }, 0);
  }, 0);
  const paintedModels = collections.reduce((sum, c) => {
    return sum + c.items.reduce((itemSum, item) => itemSum + (item.painted_count || 0), 0);
  }, 0);
  const progressPercentage = totalModels > 0 ? Math.round((paintedModels / totalModels) * 100) : 0;

  const collectionsHTML = collections
    .map((collection) => {
      const collectionTotal = collection.items.reduce((sum, item) => {
        return sum +
          (item.nib_count || 0) +
          (item.assembled_count || 0) +
          (item.primed_count || 0) +
          (item.painted_count || 0);
      }, 0);
      const collectionPainted = collection.items.reduce(
        (sum, item) => sum + (item.painted_count || 0),
        0
      );
      const collectionProgress = collectionTotal > 0
        ? Math.round((collectionPainted / collectionTotal) * 100)
        : 0;

      const itemsHTML = collection.items
        .map((item) => {
          const itemTotal =
            (item.nib_count || 0) +
            (item.assembled_count || 0) +
            (item.primed_count || 0) +
            (item.painted_count || 0);
          const status = getEffectiveStatus(item);
          const statusColor = getStatusColor(status);

          return `
            <tr>
              <td>${escapeHTML(item.name)}</td>
              <td>${escapeHTML(item.faction || '-')}</td>
              <td style="color: ${statusColor}; font-weight: 600;">${STATUS_LABELS[status]}</td>
              <td style="text-align: center;">${item.nib_count || 0}</td>
              <td style="text-align: center;">${item.assembled_count || 0}</td>
              <td style="text-align: center;">${item.primed_count || 0}</td>
              <td style="text-align: center;">${item.painted_count || 0}</td>
              <td style="text-align: center; font-weight: 600;">${itemTotal}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="collection">
          <div class="collection-header">
            <h2>${escapeHTML(collection.name)}</h2>
            ${collection.description ? `<p class="description">${escapeHTML(collection.description)}</p>` : ''}
            <div class="collection-stats">
              <span>${collection.items.length} items</span>
              <span>${collectionTotal} models</span>
              <span class="progress">${collectionProgress}% painted</span>
            </div>
          </div>
          ${collection.items.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Faction</th>
                  <th>Status</th>
                  <th>NIB</th>
                  <th>Built</th>
                  <th>Primed</th>
                  <th>Painted</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          ` : '<p class="empty">No items in this collection</p>'}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHTML(title)}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #1a1a1a;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #991b1b;
          }
          .header h1 {
            font-size: 24px;
            color: #991b1b;
            margin-bottom: 8px;
          }
          .header .date {
            color: #666;
            font-size: 11px;
          }
          .summary {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 24px;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-item .value {
            font-size: 20px;
            font-weight: 700;
            color: #991b1b;
          }
          .summary-item .label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
          }
          .collection {
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .collection-header {
            background: #991b1b;
            color: white;
            padding: 12px 16px;
            border-radius: 8px 8px 0 0;
          }
          .collection-header h2 {
            font-size: 16px;
            margin-bottom: 4px;
          }
          .collection-header .description {
            font-size: 11px;
            opacity: 0.9;
            margin-bottom: 8px;
          }
          .collection-stats {
            display: flex;
            gap: 16px;
            font-size: 11px;
            opacity: 0.9;
          }
          .collection-stats .progress {
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
          }
          th, td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          th {
            background: #f5f5f5;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
          }
          tbody tr:hover {
            background: #fafafa;
          }
          .empty {
            padding: 16px;
            text-align: center;
            color: #999;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-top: none;
          }
          @media print {
            body {
              padding: 0;
            }
            .collection {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHTML(title)}</h1>
          <p class="date">Exported on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="value">${collections.length}</div>
            <div class="label">Collections</div>
          </div>
          <div class="summary-item">
            <div class="value">${totalItems}</div>
            <div class="label">Items</div>
          </div>
          <div class="summary-item">
            <div class="value">${totalModels}</div>
            <div class="label">Models</div>
          </div>
          <div class="summary-item">
            <div class="value">${progressPercentage}%</div>
            <div class="label">Painted</div>
          </div>
        </div>

        ${collectionsHTML}
      </body>
    </html>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get status color for PDF
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'painted':
      return '#10b981';
    case 'based':
      return '#8b5cf6';
    case 'primed':
      return '#6366f1';
    case 'assembled':
      return '#991b1b';
    case 'wip':
      return '#991b1b';
    case 'nib':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
}

/**
 * Export data to CSV and share
 */
export async function exportToCSV(
  collections: ExportCollection[],
  filename: string = 'tabletop-organizer-export'
): Promise<void> {
  const csv = generateCSV(collections);
  const fileUri = `${FileSystem.documentDirectory}${filename}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Collection Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

/**
 * Export data to PDF and share
 */
export async function exportToPDF(
  collections: ExportCollection[],
  title: string = 'Tabletop Organizer Collection',
  filename: string = 'tabletop-organizer-export'
): Promise<void> {
  const html = generatePDFHTML(collections, title);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Move the file to document directory with custom filename
  const newUri = `${FileSystem.documentDirectory}${filename}.pdf`;

  // Copy the generated PDF to the new location
  await FileSystem.copyAsync({
    from: uri,
    to: newUri,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Collection Data',
      UTI: 'com.adobe.pdf',
    });
  }
}
