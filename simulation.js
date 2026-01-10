/**
 * Climate Logic Module
 * Simplified logic for educational purposes.
 */

export class ClimateModel {
    constructor() {
        // State
        this.co2 = 400; // ppm
        this.albedo = 0.3; // 0-1
        this.solarIntensity = 1361; // W/m2
        this.forestCover = 30; // %

        // Derived/Physics Constants
        this.sigma = 5.67e-8; // Stefan-Boltzmann constant
        this.preIndustrialCO2 = 280;
        
        // Simulation State
        this.temperature = 15.0; // Celsius (Current)
        this.targetTemperature = 15.0; // Celsius (Equilibrium)
    }

    updateParams(params) {
        if (params.co2 !== undefined) this.co2 = Number(params.co2);
        if (params.albedo !== undefined) this.albedo = Number(params.albedo);
        if (params.solar !== undefined) this.solarIntensity = Number(params.solar);
        if (params.forest !== undefined) this.forestCover = Number(params.forest);
    }

    /**
     * Calculates the energy balance and next temperature step.
     * Returns the current state for visualization.
     */
    step(dt = 0.1) {
        // 1. Calculate incoming energy (absorbed)
        // Solar constant is spread over the surface area of a sphere (4*pi*r^2) vs cross section (pi*r^2)
        // Hence division by 4.
        const incomingSolar = this.solarIntensity / 4;
        const absorbedSolar = incomingSolar * (1 - this.albedo);

        // 2. Calculate Greenhouse Effect / Radiative Forcing
        // Simplified formula for CO2 forcing: dF = 5.35 * ln(C/C0)
        const forcingCO2 = 5.35 * Math.log(this.co2 / this.preIndustrialCO2);
        
        // Forest effect: More forest = slightly less CO2 in reality, but here we treat it as 
        // a modifier to local cooling or albedo (though albedo is separate slider).
        // Let's say forest coverage provides a small additional cooling offset (evapotranspiration)
        // purely for the sake of making the variable do something distinct if albedo is manually set.
        // Or we can just let Albedo be the primary driver if user sets it.
        // Let's make forest affect the "natural" CO2 absorbtion rate in a dynamic model, 
        // but for this static snapshot model, maybe it just affects the "effective" emissivity.
        
        // Let's stick to the core physics:
        // Outgoing Longwave Radiation (OLR) = sigma * T^4 * epsilon
        // Greenhouse gases reduce epsilon (effective emissivity).
        
        // Base emissivity for Earth ~0.61 without extra CO2
        // We model greenhouse effect as reducing effective emissivity.
        let emissivity = 0.61 - (forcingCO2 * 0.005); 
        
        // Clamp emissivity
        emissivity = Math.max(0.5, Math.min(0.7, emissivity));

        // 3. Calculate Outgoing Radiation based on Current Temp (Kelvin)
        const currentTempK = this.temperature + 273.15;
        const outgoingRad = emissivity * this.sigma * Math.pow(currentTempK, 4);

        // 4. Energy Balance
        const netEnergy = absorbedSolar - outgoingRad; // W/m2

        // 5. Update Temperature (Thermal Inertia)
        // Earth has huge heat capacity. In this sim, we speed it up.
        // Heat Capacity (C_earth) approx... let's define an arbitrary rate for UX.
        const heatCapacity = 50; // Arbitrary unit to smooth changes
        const tempChange = (netEnergy / heatCapacity) * dt;

        this.temperature += tempChange;

        return {
            temp: this.temperature,
            netEnergy: netEnergy,
            absorbed: absorbedSolar,
            reflected: incomingSolar * this.albedo, // This is just reflected part of avg
            outgoing: outgoingRad,
            incoming: incomingSolar
        };
    }
}
