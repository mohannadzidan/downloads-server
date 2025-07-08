import { z } from "zod";

export const VolumeConfigSchema = z.object({
  name: z.string().min(1, "Volume name cannot be empty"),
  path: z.string().min(1, "Volume path cannot be empty"),
  maxSizeGb: z.number().positive("maxSizeGB must be a positive number"),
  tags: z
    .array(z.string().min(1, "Tag cannot be empty"))
    .min(1, "At least one tag is required for a volume"),
});

export const ServerConfigSchema = z.object({
  port: z
    .number()
    .int()
    .positive("Port must be a positive integer")
    .min(1024, "Port must be greater than 1023")
    .max(65535, "Port must be less than 65536"),
  host: z.string().min(1, "Host cannot be empty"),
});

export const TorrentProviderConfigSchema = z.object({
  downloadTorrentFilesPath: z
    .string()
    .min(1, "Torrent download files path cannot be empty"),
});

export const ProvidersConfigSchema = z.object({
  torrent: TorrentProviderConfigSchema,
});

export const AppConfigSchema = z.object({
  volumes: z
    .array(VolumeConfigSchema)
    .min(1, "At least one volume must be configured"),
  server: ServerConfigSchema,
  providers: ProvidersConfigSchema,
});

export type VolumeConfig = z.infer<typeof VolumeConfigSchema>;

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export type TorrentProviderConfig = z.infer<typeof TorrentProviderConfigSchema>;

export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;

export type AppConfig = z.infer<typeof AppConfigSchema>;
