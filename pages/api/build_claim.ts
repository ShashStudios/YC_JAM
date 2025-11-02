import type { NextApiRequest, NextApiResponse } from 'next';
import { APIResponse, Claim, CodeMappingResult } from '@/types';
import rulesData from '@/data/rules.json';

interface Rules {
  default_values: {
    provider: any;
  };
}

const rules: Rules = rulesData as Rules;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<Claim>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed',
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    const { mapping_result, patient_info, provider_info, service_date, place_of_service } = req.body;
    
    if (!mapping_result) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing mapping_result in request body',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    const mappingData = mapping_result as CodeMappingResult;
    
    // Build the claim structure
    const claim: Claim = {
      patient: patient_info || {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'U' as const,
      },
      provider: provider_info || {
        npi: '',
        name: rules.default_values.provider.name || '',
        taxonomy: rules.default_values.provider.taxonomy || '',
        address: rules.default_values.provider.address,
        city: rules.default_values.provider.city,
        state: rules.default_values.provider.state,
        zip: rules.default_values.provider.zip,
      },
      service_date: service_date || new Date().toISOString().split('T')[0],
      place_of_service: place_of_service || '11', // Default to office
      diagnosis_codes: mappingData.icd_codes
        .filter(c => c.confidence > 0.5)
        .map(c => c.code),
      procedures: mappingData.cpt_codes
        .filter(c => c.confidence > 0.5)
        .map(c => ({
          code: c.code,
          description: c.description,
          modifiers: [],
          units: 1,
          charge: getDefaultCharge(c.code),
        })),
    };
    
    return res.status(200).json({
      success: true,
      data: claim,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in build_claim:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'BUILD_FAILED',
        message: error.message || 'Failed to build claim',
        details: error,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get default charge for a CPT code (simplified pricing)
 */
function getDefaultCharge(cptCode: string): number {
  // E/M codes
  if (cptCode.startsWith('99')) {
    const codeNum = parseInt(cptCode);
    if (codeNum >= 99211 && codeNum <= 99215) {
      return 100 + ((codeNum - 99211) * 30); // $100-$220
    }
    if (codeNum >= 99203 && codeNum <= 99205) {
      return 150 + ((codeNum - 99203) * 60); // $150-$270
    }
  }
  
  // Surgery codes
  if (cptCode.startsWith('1')) {
    return 150;
  }
  
  // Radiology
  if (cptCode.startsWith('7')) {
    if (cptCode.includes('70')) return 1200; // MRI
    return 200; // X-ray
  }
  
  // Lab
  if (cptCode.startsWith('8')) {
    return 75;
  }
  
  // Default
  return 100;
}

