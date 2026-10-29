import appbuilder from '../data/appbuilder.json'
import admin from '../data/questions.json'
import { CERTS } from '../domain/certs.ts'
import type { CertId } from '../domain/types.ts'
import { makeCertData, type CertData } from './certdata.ts'

export const CERT_DATA: Record<CertId, CertData> = {
  admin: makeCertData(CERTS.admin, admin),
  appbuilder: makeCertData(CERTS.appbuilder, appbuilder),
}
