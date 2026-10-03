import type {
  DocumentMetadata,
  ExtractionResult,
} from "@/core/documents/schema";

export type DocumentExtractionRequest<TPayload = unknown> = {
  document: DocumentMetadata;
  payload: TPayload;
};

export interface DocumentExtractor<TPayload = unknown> {
  readonly id: string;
  readonly version: string;

  extract(
    request: DocumentExtractionRequest<TPayload>,
  ): Promise<ExtractionResult>;
}
