const Vehicle = require('../models/Vehicle');
const Personnel = require('../models/Personnel');
const Visitor = require('../models/Visitor');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const empty = (value) => value || '--';

function formatVehicleName(source) {
  if (!source) return null;
  const make = source.make?.trim();
  const model = source.model?.trim() || source.vehicleModel?.trim();
  const vehicleType = source.vehicleType?.trim();
  const name = [make, model].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (model) return model;
  if (vehicleType) return vehicleType;
  return null;
}

function vehicleNameFromSubject(subjectName) {
  if (!subjectName) return null;
  const match = subjectName.match(/^(.+?)\s*\([^)]+\)\s*$/);
  return match?.[1]?.trim() || null;
}

async function resolveDriverNameForEntry({ type, subjectId, subjectName, driverName, vehicleId }) {
  if (driverName) return driverName;

  if (type === 'Vehicle' && subjectId) {
    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId).select('ownerName');
      if (vehicle?.ownerName) return vehicle.ownerName;
    }
    const vehicle = await Vehicle.findOne({
      plateNumber: { $regex: new RegExp(`^${escapeRegex(subjectId.trim())}$`, 'i') }
    }).select('ownerName');
    return vehicle?.ownerName || null;
  }

  if (type === 'Personnel' && subjectId) {
    const personnel = await Personnel.findOne({ personnelId: subjectId }).select('hasVehicle fullName');
    if (personnel?.hasVehicle) return subjectName || personnel.fullName;
  }

  if (type === 'Visitor' && subjectId) {
    const visitor = await Visitor.findOne({ visitorId: subjectId }).select('hasVehicle fullName');
    if (visitor?.hasVehicle) return subjectName || visitor.fullName;
  }

  return null;
}

function buildVehicleFields(log, vehicleByPlate, personnelMap, visitorMap) {
  let ownerName = null;
  let plateNumber = null;
  let recordId = log.subjectId || null;
  let vehicleName = null;

  if (log.type === 'Vehicle') {
    const vehicle = log.vehicle && typeof log.vehicle === 'object'
      ? log.vehicle
      : (log.subjectId ? vehicleByPlate.get(log.subjectId.toLowerCase()) : null);

    ownerName = vehicle?.ownerName || log.driverName || null;
    plateNumber = vehicle?.plateNumber || log.subjectId || null;
    recordId = vehicle?.vehicleId || log.subjectId || null;
    vehicleName = formatVehicleName(vehicle) || vehicleNameFromSubject(log.subjectName);
  } else if (log.type === 'Personnel') {
    const personnel = log.personnel && typeof log.personnel === 'object'
      ? log.personnel
      : personnelMap.get(log.subjectId);

    recordId = log.subjectId || personnel?.personnelId || null;
    if (personnel?.hasVehicle) {
      ownerName = log.subjectName || personnel.fullName || null;
      plateNumber = personnel.vehicleDetails?.plateNumber || null;
      vehicleName = formatVehicleName({
        model: personnel.vehicleDetails?.model,
        make: personnel.vehicleDetails?.make,
      });
    }
  } else if (log.type === 'Visitor') {
    const visitor = log.visitor && typeof log.visitor === 'object'
      ? log.visitor
      : visitorMap.get(log.subjectId);

    recordId = log.subjectId || visitor?.visitorId || null;
    if (visitor?.hasVehicle) {
      ownerName = log.subjectName || visitor.fullName || null;
      plateNumber = visitor.vehiclePlate || null;
      vehicleName = formatVehicleName({ model: visitor.vehicleModel });
    }
  }

  return {
    ownerName: empty(ownerName),
    plateNumber: empty(plateNumber),
    recordId: empty(recordId),
    vehicleName: empty(vehicleName),
  };
}

async function enrichLogsWithDrivers(logs) {
  const plainLogs = logs.map((log) => (log.toObject ? log.toObject() : { ...log }));

  const plates = new Set();
  const personnelIds = new Set();
  const visitorIds = new Set();

  for (const log of plainLogs) {
    if (log.type === 'Vehicle' && log.subjectId && !(log.vehicle?.ownerName && log.vehicle?.plateNumber)) {
      plates.add(log.subjectId.trim());
    }
    if (log.type === 'Personnel' && log.subjectId && !log.personnel) {
      personnelIds.add(log.subjectId);
    }
    if (log.type === 'Visitor' && log.subjectId && !log.visitor) {
      visitorIds.add(log.subjectId);
    }
  }

  const [vehicleDocs, personnelDocs, visitorDocs] = await Promise.all([
    plates.size
      ? Vehicle.find({ $or: [...plates].map((plate) => ({ plateNumber: new RegExp(`^${escapeRegex(plate)}$`, 'i') })) })
          .select('vehicleId plateNumber ownerName make model vehicleType')
      : [],
    personnelIds.size
      ? Personnel.find({ personnelId: { $in: [...personnelIds] } })
          .select('personnelId fullName hasVehicle vehicleDetails')
      : [],
    visitorIds.size
      ? Visitor.find({ visitorId: { $in: [...visitorIds] } })
          .select('visitorId fullName hasVehicle vehiclePlate vehicleModel')
      : [],
  ]);

  const vehicleByPlate = new Map(vehicleDocs.map((v) => [v.plateNumber.toLowerCase(), v]));
  const personnelMap = new Map(personnelDocs.map((p) => [p.personnelId, p]));
  const visitorMap = new Map(visitorDocs.map((v) => [v.visitorId, v]));

  return plainLogs.map((log) => {
    let driverName = log.driverName || null;

    if (!driverName && log.type === 'Vehicle') {
      const vehicle = log.vehicle && typeof log.vehicle === 'object'
        ? log.vehicle
        : (log.subjectId ? vehicleByPlate.get(log.subjectId.toLowerCase()) : null);
      driverName = vehicle?.ownerName || null;
    } else if (!driverName && log.type === 'Personnel') {
      const personnel = log.personnel && typeof log.personnel === 'object'
        ? log.personnel
        : personnelMap.get(log.subjectId);
      if (personnel?.hasVehicle) driverName = log.subjectName || personnel.fullName;
    } else if (!driverName && log.type === 'Visitor') {
      const visitor = log.visitor && typeof log.visitor === 'object'
        ? log.visitor
        : visitorMap.get(log.subjectId);
      if (visitor?.hasVehicle) driverName = log.subjectName || visitor.fullName;
    }

    const vehicleFields = buildVehicleFields(log, vehicleByPlate, personnelMap, visitorMap);

    return {
      ...log,
      driverName: empty(driverName),
      ownerName: vehicleFields.ownerName,
      plateNumber: vehicleFields.plateNumber,
      recordId: vehicleFields.recordId,
      vehicleName: vehicleFields.vehicleName,
    };
  });
}

module.exports = { resolveDriverNameForEntry, enrichLogsWithDrivers };
