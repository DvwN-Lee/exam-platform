{{/*
Expand the name of the chart.
*/}}
{{- define "exam-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "exam-platform.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "exam-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Namespace - prioritize values.namespace.name over release namespace
*/}}
{{- define "exam-platform.namespace" -}}
{{- if .Values.namespace.name }}
{{- .Values.namespace.name }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "exam-platform.labels" -}}
helm.sh/chart: {{ include "exam-platform.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "exam-platform.backend.labels" -}}
{{ include "exam-platform.labels" . }}
{{ include "exam-platform.backend.selectorLabels" . }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "exam-platform.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "exam-platform.name" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "exam-platform.frontend.labels" -}}
{{ include "exam-platform.labels" . }}
{{ include "exam-platform.frontend.selectorLabels" . }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "exam-platform.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "exam-platform.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "exam-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "exam-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend fullname
*/}}
{{- define "exam-platform.backend.fullname" -}}
{{- printf "%s-backend" (include "exam-platform.fullname" .) }}
{{- end }}

{{/*
Frontend fullname
*/}}
{{- define "exam-platform.frontend.fullname" -}}
{{- printf "%s-frontend" (include "exam-platform.fullname" .) }}
{{- end }}

{{/*
ConfigMap name
*/}}
{{- define "exam-platform.configMapName" -}}
{{- printf "%s-config" (include "exam-platform.fullname" .) }}
{{- end }}

{{/*
Secret name
*/}}
{{- define "exam-platform.secretName" -}}
{{- if .Values.secrets.create }}
{{- printf "%s-secret" (include "exam-platform.fullname" .) }}
{{- else }}
{{- .Values.secrets.externalSecretName }}
{{- end }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "exam-platform.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Backend image
*/}}
{{- define "exam-platform.backend.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" -}}
{{- $repository := .Values.backend.image.repository -}}
{{- $tag := .Values.backend.image.tag | default .Chart.AppVersion -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Frontend image
*/}}
{{- define "exam-platform.frontend.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" -}}
{{- $repository := .Values.frontend.image.repository -}}
{{- $tag := .Values.frontend.image.tag | default .Chart.AppVersion -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Redis URL construction
*/}}
{{- define "exam-platform.redisUrl" -}}
{{- printf "redis://:%s@%s:%s/0" "$(REDIS_PASSWORD)" .Values.config.redisHost .Values.config.redisPort }}
{{- end }}
