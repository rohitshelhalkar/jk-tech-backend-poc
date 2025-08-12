export const UserRole = {
    ADMIN: 'ADMIN',
    VIEWER: 'VIEWER',
    EDITOR: 'EDITOR',
} as const;


export const UserRoleList = Object.values(UserRole);

export const IngestionStatus = {
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
};

export const DocumentStatus = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED', 
  FAILED: 'FAILED',
};