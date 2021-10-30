import { createSelector, props } from '@ngrx/store';
import { getRootState, AppState } from '../reducers';
import { locationsAdapter, LocationsState } from '../states';
import * as _ from 'lodash';
import { Location } from 'src/app/core/models';
import {
  getBedsFromAdmissionLocation,
  getBedsUnderCurrentLocation,
  getCabinentsUnderCurrentLocation,
} from 'src/app/modules/inpatient/resources/helpers/admission.helper';

const getLocationsState = createSelector(
  getRootState,
  (state: AppState) => state.locations
);

export const getLocationsLoadingError = createSelector(
  getLocationsState,
  (state: LocationsState) => state.error
);

export const getLocationsLoadingHasErrorState = createSelector(
  getLocationsState,
  (state: LocationsState) => state.hasError
);

export const getLocationsLoadingState = createSelector(
  getLocationsState,
  (state: LocationsState) => state.loading
);

export const getSettingCurrentLocationStatus = createSelector(
  getLocationsState,
  (state: LocationsState) => state.settingLocation
);

export const { selectEntities: getLocationEntities, selectAll: getLocations } =
  locationsAdapter.getSelectors(getLocationsState);

export const getStoreLocations = createSelector(
  getLocations,
  (locations: Location[]) => {
    return _.filter(locations, (location) => {
      if ((_.filter(location?.tags, { display: 'Store' }) || [])?.length > 0) {
        return location;
      }
    });
  }
);

export const getParentLocation = createSelector(
  getLocations,
  (locations: Location[]) => {
    return _.filter(locations, { parentLocation: null }) &&
      _.filter(locations, { parentLocation: null }).length > 0
      ? _.filter(locations, { parentLocation: null })[0]
      : null;
  }
);

export const getParentLocationTree = createSelector(
  getLocations,
  (locations: Location[]) => {
    return _.filter(locations, { parentLocation: null }) &&
      _.filter(locations, { parentLocation: null }).length > 0
      ? _.filter(locations, { parentLocation: null })
      : null;
  }
);

export const getChildLocationsOfTheFirstLevelParentLocation = createSelector(
  getLocations,
  (locations: Location[]) =>
    _.filter(locations, (location) => {
      if (
        location.parentLocation &&
        (
          location.tags.filter(
            (tag) => tag?.display.toLowerCase() === 'login location'
          ) || []
        )?.length > 0
      ) {
        return location;
      }
    })
);

export const getCurrentLocation = createSelector(
  getLocationsState,
  (state: LocationsState) => {
    const formsAttributes =
      state.currentUserCurrentLocation &&
      state.currentUserCurrentLocation?.attributes
        ? state.currentUserCurrentLocation.attributes.filter(
            (attribute) => attribute?.attributeType?.display === 'Forms'
          ) || []
        : [];
    const localStoredLocation = localStorage.getItem('currentLocation');
    const location = state.currentUserCurrentLocation
      ? state.currentUserCurrentLocation
      : localStoredLocation &&
        localStoredLocation !== 'undefined' &&
        localStoredLocation !== ''
      ? JSON.parse(localStoredLocation)
      : null;
    return {
      ...location,
      id: location?.uuid,
      minorProcedureLocation: location
        ? location &&
          (
            location.tags.filter(
              (tag) => tag?.display === 'Minor Procedure Location'
            ) || []
          )?.length > 0
        : false,
      forms:
        formsAttributes?.length > 0
          ? formsAttributes.map((attribute) => {
              return attribute?.value;
            })
          : [],
    };
  }
);

export const getLocationLoadingStatus = createSelector(
  getLocationsState,
  (locationState: LocationsState) => locationState.loading
);

export const getIfCurrentLocationIsMainStore = createSelector(
  getLocationsState,
  (state: LocationsState) =>
    state.currentUserCurrentLocation &&
    state.currentUserCurrentLocation?.tags &&
    (
      state.currentUserCurrentLocation.tags.filter(
        (tag) => tag?.display.toLowerCase() === 'main store'
      ) || []
    )?.length > 0
);

export const getAllTreatmentLocations = createSelector(
  getLocations,
  (locations: Location[]) => {
    return _.filter(locations, (location) => {
      if (
        (_.filter(location?.tags, { display: 'Treatment Room' }) || [])
          ?.length > 0
      ) {
        const matchedBillingConceptConfigurations =
          (location?.attributes.filter(
            (attribute) =>
              attribute?.attributeType?.display.toLowerCase() ===
              'billing concept'
          ) || [])[0];
        return {
          ...location,
          billingConcept: matchedBillingConceptConfigurations
            ? matchedBillingConceptConfigurations?.value
            : null,
        };
      }
    });
  }
);

export const getLocationById = createSelector(
  getLocations,
  (locations: Location[], props) =>
    (_.filter(locations, { id: props?.id }) || [])[0]
);

export const getBedsGroupedByTheCurrentLocationChildren = createSelector(
  getLocations,
  (locations: Location[], props) => {
    const currentLocation = (_.filter(locations, { id: props?.id }) || [])[0];

    if (currentLocation?.areChildLocationsBeds) {
      return currentLocation;
    } else {
      // Filter all beds locations under the children of the current location
      let formattedCurrentLocation = {
        ...currentLocation,
        childLocations: [],
      };
      let beds = [];
      _.map(currentLocation?.childLocations, (childLocation, index) => {
        let ward = {
          ...childLocation,
          childLocations: getBedsUnderCurrentLocation(
            locations,
            childLocation?.uuid
          ),
        };
        beds = [...beds, ward];
      });
      formattedCurrentLocation.childLocations = beds;
      return formattedCurrentLocation;
    }
  }
);

export const getCabinetsGroupedByTheCurrentLocationChildren = createSelector(
  getLocations,
  (locations: Location[], props) => {
    const currentLocation = (_.filter(locations, { id: props?.id }) || [])[0];

    if (currentLocation?.areChildLocationsCabinets) {
      return currentLocation;
    } else {
      // Filter all beds locations under the children of the current location
      let formattedCurrentLocation = {
        ...currentLocation,
        childLocations: [],
      };
      let cabinets = [];
      _.map(currentLocation?.childLocations, (childLocation, index) => {
        let cabinet = {
          ...childLocation,
          childLocations: getCabinentsUnderCurrentLocation(
            locations,
            childLocation?.uuid
          ),
        };
        cabinets = [...cabinets, cabinet];
      });
      formattedCurrentLocation.childLocations = cabinets;
      return formattedCurrentLocation;
    }
  }
);

function getChildLocationMembers(childLocations, locations) {
  if (childLocations?.length === 0) {
    return [];
  }
  return childLocations.map((location) => {
    const currentLocation = (locations.filter(
      (loc) => loc.uuid === location.uuid
    ) || [])[0];
    const patientPerBedAttribute =
      currentLocation &&
      currentLocation.attributes &&
      currentLocation.attributes?.length > 0
        ? (currentLocation.attributes.filter(
            (attribute) =>
              attribute?.attributeType?.display === 'Patients per bed'
          ) || [])[0]
        : null;
    return {
      ...currentLocation,
      childMembers: getChildLocationMembers(
        currentLocation?.childLocations || [],
        locations
      ),
      isBed:
        currentLocation &&
        currentLocation?.tags &&
        (
          currentLocation.tags.filter(
            (tag) => tag?.display === 'Bed Location'
          ) || []
        )?.length > 0,
      patientsPerBed: patientPerBedAttribute
        ? parseInt(patientPerBedAttribute?.value)
        : 1,
    };
  });
}

export const getAllLocationsUnderWardAsFlatArray = createSelector(
  getLocations,
  (locations: Location[], props) => {
    let currentLocation = (locations.filter(
      (location) => location?.uuid === props?.id
    ) || [])[0];
    if (!currentLocation) {
      return [];
    }

    const patientPerBedAttribute =
      currentLocation &&
      currentLocation.attributes &&
      currentLocation.attributes?.length > 0
        ? (currentLocation.attributes.filter(
            (attribute) =>
              attribute?.attributeType?.display === 'Patients per bed'
          ) || [])[0]
        : null;

    const formattedLocation = {
      ...currentLocation,
      childMembers: getChildLocationMembers(
        currentLocation?.childLocations,
        locations
      ),
      isBed:
        currentLocation &&
        currentLocation?.tags &&
        (
          currentLocation.tags.filter(
            (tag) => tag?.display === 'Bed Location'
          ) || []
        )?.length > 0,
      patientsPerBed: patientPerBedAttribute
        ? parseInt(patientPerBedAttribute?.value)
        : 1,
    };
    return _.uniq([
      currentLocation?.uuid,
      ...flattenList([formattedLocation]).map((item) => item.id),
    ]);
  }
);

function flattenList(list) {
  return _.flatten(
    list.map((item) => {
      return [
        _.omit(item, 'childMembers'),
        ...(item.childMembers ? flattenList(item.childMembers || []) : []),
      ];
    })
  );
}

function getItems(location): string[] {
  let locationIds = [];
  location.childMembers.forEach((member) => {
    while (member.childMembers.length > 0) {
      locationIds = [...locationIds, member?.id];
      getItems(member);
    }
  });
  return locationIds;
}

export const getAllBedsUnderCurrentWard = createSelector(
  getLocations,
  (locations: Location[], props) => {
    let currentLocation = (locations.filter(
      (location) => location?.uuid === props?.id
    ) || [])[0];
    if (!currentLocation) {
      return {};
    }
    const formattedLocation = {
      ...currentLocation,
      childMembers: getChildLocationMembers(
        currentLocation?.childLocations,
        locations
      ),
      isBed:
        currentLocation &&
        currentLocation?.tags &&
        (
          currentLocation.tags.filter(
            (tag) => tag?.display === 'Bed Location'
          ) || []
        )?.length > 0,
    };

    // console.log('formattedLocation', formattedLocation);
    return formattedLocation;
    // const beds = getBedsUnderCurrentLocation(locations, props?.id);

    // return _.uniq([
    //   ..._.map(getBedsUnderCurrentLocation(locations, props?.id), (bed) => {
    //     return bed?.uuid;
    //   }),
    //   props?.id,
    // ]);
  }
);

export const getAllCabinetsUnderCurrentLocation = createSelector(
  getLocations,
  (locations: Location[], props) => {
    return _.uniq([
      ..._.map(
        getCabinentsUnderCurrentLocation(locations, props?.id),
        (cabinet) => {
          return cabinet?.uuid;
        }
      ),
      props?.id,
    ]);
  }
);

export const getLocationsByTagName = createSelector(
  getLocations,
  (locations: Location[], props) =>
    _.filter(locations, (location) => {
      if (
        (_.filter(location?.tags, { name: props?.tagName }) || [])?.length > 0
      ) {
        return location;
      }
    })
);