export type SyncPayload = { caseNumber: string; nextHearingAt?: string; status?: string };
export interface CourtSyncConnector { name: string; sync(payload: SyncPayload[]): Promise<{ imported: number }>; }

export class StubConnector implements CourtSyncConnector {
  name = 'Official Connector Stub';
  async sync(payload: SyncPayload[]) { return { imported: payload.length }; }
}
