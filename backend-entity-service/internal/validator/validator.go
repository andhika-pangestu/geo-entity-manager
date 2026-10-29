package validator

import (
	"errors"
	"fmt"
	"strings"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"github.com/go-playground/validator/v10"
)

// FormatValidationErrors converts Gin/go-playground validation errors into structured field issues.
func FormatValidationErrors(err error) []models.ValidationErrorDetail {
	var validationErrs validator.ValidationErrors
	if !errors.As(err, &validationErrs) {
		return []models.ValidationErrorDetail{
			{
				Field: "body",
				Issue: "invalid JSON payload or malformed data types",
			},
		}
	}

	details := make([]models.ValidationErrorDetail, 0, len(validationErrs))
	for _, fieldErr := range validationErrs {
		fieldName := strings.ToLower(fieldErr.Field())
		details = append(details, models.ValidationErrorDetail{
			Field: fieldName,
			Issue: formatIssueMessage(fieldName, fieldErr),
		})
	}
	return details
}

func formatIssueMessage(field string, fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "min":
		return fmt.Sprintf("%s length must be at least %s characters", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s length must not exceed %s characters", field, fe.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, fe.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, fe.Param())
	case "oneof":
		allowed := strings.ReplaceAll(fe.Param(), " ", ", ")
		return fmt.Sprintf("%s must be one of: %s", field, allowed)
	default:
		return fmt.Sprintf("%s failed %s validation", field, fe.Tag())
	}
}
