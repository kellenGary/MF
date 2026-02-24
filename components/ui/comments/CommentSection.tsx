import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, TextInput, Alert, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import api, { Comment } from '@/services/api';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface CommentSectionProps {
    entityType: number; // 0=Track, 1=Album, 2=Artist
    entityId: string;
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const fetchComments = useCallback(async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            const fetched = await api.getComments(entityType, entityId, pageNum, 10);
            if (fetched.length < 10) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            setComments(prev => append ? [...prev, ...fetched] : fetched);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            if (pageNum === 1) setLoading(false);
        }
    }, [entityType, entityId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handlePost = async () => {
        if (!text.trim() || posting) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPosting(true);
        try {
            const newComment = await api.postComment(entityType, entityId, text.trim());
            setComments(prev => [newComment, ...prev]);
            setText('');
        } catch (error) {
            console.error('Failed to post comment', error);
            Alert.alert('Error', 'Could not post comment. Please try again.');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.deleteComment(id);
                        setComments(prev => prev.filter(c => c.id !== id));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (error) {
                        console.error('Failed to delete comment', error);
                        Alert.alert('Error', 'Could not delete comment.');
                    }
                }
            }
        ]);
    };

    const loadMore = () => {
        if (hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchComments(nextPage, true);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const time = new Date(dateStr).getTime();
        const now = Date.now();
        const diff = now - time;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <View style={styles.container}>
            <ThemedText style={[styles.title, { color: colors.text }]}>Comments ({comments.length})</ThemedText>

            {/* Input section */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: isDark ? '#333' : '#eee' }]}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.icon}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={1000}
                />
                <Pressable
                    style={[styles.postButton, (!text.trim() || posting) && { opacity: 0.5 }]}
                    onPress={handlePost}
                    disabled={!text.trim() || posting}
                >
                    {posting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <MaterialIcons name="send" size={20} color="#fff" />
                    )}
                </Pressable>
            </View>

            {/* Comments List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : comments.length === 0 ? (
                <View style={[styles.centerContainer, { paddingVertical: 32 }]}>
                    <MaterialIcons name="chat-bubble-outline" size={32} color={colors.icon} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <ThemedText style={{ color: colors.icon, textAlign: 'center' }}>Be the first to comment</ThemedText>
                </View>
            ) : (
                <View style={styles.commentsList}>
                    {comments.map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                            <Pressable onPress={() => router.push(`/profile/${comment.authorId}` as any)}>
                                {comment.authorProfileImageUrl ? (
                                    <Image source={{ uri: comment.authorProfileImageUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#333' : '#eee' }]}>
                                        <MaterialIcons name="person" size={20} color={colors.icon} />
                                    </View>
                                )}
                            </Pressable>

                            <View style={styles.commentContent}>
                                <View style={styles.commentHeader}>
                                    <Pressable onPress={() => router.push(`/profile/${comment.authorId}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                                        <ThemedText style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                                            {comment.authorDisplayName || comment.authorHandle || "Unknown"}
                                        </ThemedText>
                                    </Pressable>
                                    <ThemedText style={{ fontSize: 12, color: colors.icon }}>
                                        {formatRelativeTime(comment.createdAt)}
                                    </ThemedText>
                                </View>

                                <ThemedText style={[styles.commentText, { color: colors.text }]}>
                                    {comment.text}
                                </ThemedText>
                            </View>

                            {comment.isOwner && (
                                <Pressable style={styles.deleteButton} onPress={() => handleDelete(comment.id)}>
                                    <MaterialIcons name="more-horiz" size={18} color={colors.icon} />
                                </Pressable>
                            )}
                        </View>
                    ))}

                    {hasMore && (
                        <Pressable style={styles.loadMoreButton} onPress={loadMore}>
                            <ThemedText style={[{ color: colors.primary, fontWeight: '600' }]}>Load more comments</ThemedText>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
        marginTop: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 14,
    },
    postButton: {
        backgroundColor: '#1DB954',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentsList: {
        gap: 16,
    },
    centerContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentItem: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '600',
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    deleteButton: {
        padding: 4,
        opacity: 0.7,
    },
    loadMoreButton: {
        padding: 12,
        alignItems: 'center',
    }
});
