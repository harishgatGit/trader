import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';

interface ReportSectionProps {
  title: string;
  summary: string;
  details?: string;
  initialExpanded?: boolean;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  summary,
  details,
  initialExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  // Helper to parse key numbers and wrap them in custom styling
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Simple regex to detect percentages, dollar amounts, and targets (e.g. 50%, $150, 4.5x)
    const regex = /(\b\d+%\b|\$\d+(?:\.\d+)?|\b\d+(?:\.\d+)?x\b)/g;
    const parts = text.split(regex);

    return (
      <Text style={styles.paragraph}>
        {parts.map((part, idx) => {
          const isHighlight = regex.test(part);
          return (
            <Text
              key={idx}
              style={isHighlight ? styles.highlightNumber : null}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.summaryContainer}>
        {renderFormattedText(summary)}
      </View>

      {details && (
        <View style={styles.detailsWrapper}>
          {expanded && (
            <View style={styles.detailsContent}>
              {details.split('\n\n').map((para, idx) => (
                <View key={idx} style={styles.paraWrapper}>
                  {renderFormattedText(para)}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonText}>
              {expanded ? 'Show Less' : 'Read Deep Analysis'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginVertical: 6,
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summaryContainer: {
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  highlightNumber: {
    color: Colors.primary,
    fontWeight: '700',
  },
  detailsWrapper: {
    marginTop: 8,
  },
  detailsContent: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 12,
  },
  paraWrapper: {
    marginBottom: 10,
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
export default ReportSection;
