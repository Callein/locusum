package com.locusum.server.domain

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class VectorConverter : AttributeConverter<List<Double>?, Any?> {
    
    private val objectMapper = ObjectMapper()

    override fun convertToDatabaseColumn(attribute: List<Double>?): String? {
        if (attribute == null) return null
        // Convert List<Double> to JSON String "[0.1, 0.2, ...]"
        return try {
            objectMapper.writeValueAsString(attribute)
        } catch (e: Exception) {
            throw RuntimeException("Failed to convert vector to string", e)
        }
    }

    override fun convertToEntityAttribute(dbData: Any?): List<Double>? {
        if (dbData == null) return null
        
        // Handle PGobject (from Postgres driver) or String (if manually passed or different driver behavior)
        val jsonString = if (dbData is org.postgresql.util.PGobject) {
            dbData.value
        } else {
            dbData.toString()
        }

        if (jsonString.isNullOrBlank()) return null

        // Convert JSON String (or PGvector string output) back to List<Double>
        return try {
            objectMapper.readValue(jsonString, object : TypeReference<List<Double>>() {})
        } catch (e: Exception) {
            throw RuntimeException("Failed to convert string to vector: $jsonString", e)
        }
    }
}
