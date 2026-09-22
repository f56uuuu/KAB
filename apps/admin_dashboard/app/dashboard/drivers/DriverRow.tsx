'use client';

import { useState, useTransition } from 'react';
import { approveDriver, rejectDriver, requestMoreInfo, suspendDriver } from './actions';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  MORE_INFO_REQUIRED: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  BLOCKED: 'bg-red-200 text-red-800',
};

export function DriverRow({ driver }: { driver: any }) {
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState<'reject' | 'more_info' | 'suspend' | null>(null);
  const [note, setNote] = useState('');

  function submitWithNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      if (noteOpen === 'reject') await rejectDriver(driver.id, driver.status, note);
      if (noteOpen === 'more_info') await requestMoreInfo(driver.id, driver.status, note);
      if (noteOpen === 'suspend') await suspendDriver(driver.id, driver.status, note);
      setNoteOpen(null);
      setNote('');
    });
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-surface">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-secondary">{driver.profiles?.full_name ?? 'Unnamed driver'}</p>
          <p className="text-sm text-gray-500">{driver.profiles?.phone}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[driver.status]}`}>
          {driver.status}
        </span>
      </div>

      <div className="mt-3 flex gap-2 text-sm">
        <a href={`/dashboard/drivers/${driver.id}`} className="text-primary font-medium">
          View documents →
        </a>
      </div>

      {(driver.status === 'PENDING' || driver.status === 'UNDER_REVIEW' || driver.status === 'MORE_INFO_REQUIRED') && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => approveDriver(driver.id, driver.status))}
            className="bg-success text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={isPending}
            onClick={() => setNoteOpen('more_info')}
            className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            Request more info
          </button>
          <button
            disabled={isPending}
            onClick={() => setNoteOpen('reject')}
            className="bg-danger text-white text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            Reject
          </button>
        </div>
      )}

      {driver.status === 'APPROVED' && (
        <div className="mt-4">
          <button
            disabled={isPending}
            onClick={() => setNoteOpen('suspend')}
            className="bg-danger/10 text-danger text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            Suspend driver
          </button>
        </div>
      )}

      {noteOpen && (
        <div className="mt-3 border-t border-border pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (required — stored in admin_notes and the audit log)"
            className="w-full border border-border rounded-lg p-2 text-sm"
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={submitWithNote} className="bg-secondary text-white text-sm px-3 py-1.5 rounded-lg">
              Confirm
            </button>
            <button onClick={() => setNoteOpen(null)} className="text-sm text-gray-500 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
